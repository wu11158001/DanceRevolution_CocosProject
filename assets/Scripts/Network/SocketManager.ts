import { _decorator, Component, Node, director} from 'cc';
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager, ViewType } from 'db://assets/Scripts/Manager/ViewManager';
import { MessagePopupView } from 'db://assets/Scripts/View/Common/MessagePopupView';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, IRoomData, DIFFICULTY_TYPE, IRoomListData } from 'db://assets/Scripts/Data/RoomData';
import { RoomView } from '../View/LobbyScene/RoomView/RoomView';
import { LobbyView } from '../View/LobbyScene/LobbyView/LobbyView';
import { AudioManager } from '../Manager/AudioManager';

const { ccclass, property } = _decorator;

/**
 * Socket 網路管理中心
 */
@ccclass('SocketManager')
export class SocketManager extends SingletonComponent<SocketManager> {    
    /**
     * 伺服器 URL
     */
    private readonly serverUrl: string = 'https://dancerevolution-server.onrender.com';
    
    public socket: Socket | null = null;
    
    /**
     * 當前玩家 ID
     */
    public playerId: string = '';

    /**
     * 伺服器時間偏移量（毫秒）
     */
    public serverTimeOffset: number = 0;

    protected onLoad(): void {
        super.onLoad();

        // 監聽:角色切換請求
        director.on('REQ_CHARACTER_CHANGE', this.sendChangeCharacter, this);
    }

    protected onDestroy(): void {
        director.off('REQ_CHARACTER_CHANGE', this.sendChangeCharacter, this);

        super.onDestroy();
    }

    /**
     * 建立與遊戲伺服器的 Socket.IO 連線
     */
    public connectToServer(): void {
        console.log(`[SocketManager] 正在嘗試連線至伺服器: ${this.serverUrl}`);

        // 初始化 Socket.IO 連線
        // 指定使用 WebSocket 協議，避免 HTTP 長輪詢
        this.socket = io(this.serverUrl, {
            transports: ['websocket'],  // 強制使用 WebSocket（效能最佳）
            reconnection: false,        // 關閉自動重連
        });

        /**
         * 監聽：連線成功事件
         */
        this.socket.on('connect', () => {
            console.log(`[SocketManager] ✓ 已成功連接至伺服器！Socket ID: ${this.socket?.id}`);
        });
        
        /**
         * 監聽：斷線事件
         */
        this.socket.on('disconnect', (reason: string) => {
            console.warn(`[SocketManager] ✗ 與伺服器斷開連線，原因: ${reason}`);

            // 停止音樂播放
            AudioManager.getInstance().stopBGM();

            // 顯示斷線訊息並提供重連選項
            ViewManager.getInstance().openView<MessagePopupView>(ViewType.MessagePopupView, "Highest").then(popup => {
                popup?.setData(
                    "與伺服器斷開連線!", 
                    () => director.emit('REQ_LOAD_SCENE', 'EntryScene'),  // 返回登入畫面重新連接
                    null, 
                    false, 
                    "重新連接"
                );
            });
        });

        /**
         * 監聽：連線錯誤事件
         */
        this.socket.on('connect_error', (error: Error) => {
            console.error(`[SocketManager] ✗ 連線伺服器失敗:`, error.message);
            this.onConnectError();
        });

        /**
         * 監聽：玩家初始化事件
         */
        this.socket.on('init_player', (data: { playerId: string; nickname: string; message: string }) => {
            // 更新玩家資料
            PlayerData.playerId = data.playerId;
            PlayerData.nickname = data.nickname;

            console.log(`[SocketManager] 玩家初始化完成:\n${JSON.stringify(data, null, 2)}`);
            
            // 初始化完成，進入大廳
            this.onInitComplete();
        });

        /**
         * 監聽：房間資訊更新事件
         */
        this.socket.on('room_updated', (data: IRoomData) => {
            // 更新全域房間資料
            RoomData.update(data);
        });

        /**
         * 監聽：準備開始遊戲事件
         */
        this.socket.on('prepare_game', (data: any) => {
            console.log("[SocketManager] 收到準備正式開始遊戲指令");
            
            // 更新歌曲資料
            RoomData.updateSongs(data);
            
            // 切換到遊戲場景
            director.emit('REQ_LOAD_SCENE', 'GameScene');
        });
    }

    /**
     * 初始化完成處理
     */
    private async onInitComplete(): Promise<void> {
        // 切換場景到大廳
        director.emit('REQ_LOAD_SCENE', 'LobbyScene');
    }

    /**
     * 連線伺服器失敗處理
     */
    private async onConnectError(): Promise<void> {
        // 停止音樂播放
        AudioManager.getInstance().stopBGM();

        // 顯示連線失敗訊息
        ViewManager.getInstance().openView<MessagePopupView>(ViewType.MessagePopupView, "Highest").then(popup => {
            popup?.setData(
                "連線伺服器失敗!", 
                () => director.emit('REQ_LOAD_SCENE', 'EntryScene'),  // 返回登入畫面重試
                null, 
                false, 
                "重新連接"
            );
        });
    }

    /**
     * 多次採樣時間同步
     * @param sampleCount 採樣次數（預設 5 次）
     * @returns Promise<void> 同步完成的 Promise
     */
    public async syncServerTime(sampleCount: number = 5): Promise<void> {
        // 防禦性檢查
        if (!this.socket) {
            console.warn('[SocketManager] Socket 未初始化，無法進行時間同步');
            return;
        }

        // 儲存所有採樣結果
        const samples: { rtt: number; offset: number }[] = [];

        // 執行多次採樣
        for (let i = 0; i < sampleCount; i++) {
            await new Promise<void>((resolve) => {
                // 記錄發送時間
                const sendTime = Date.now();
                
                // 向伺服器請求時間戳記
                this.socket!.emit('sync_time', sendTime, (res: { clientTime: number; serverTime: number }) => {
                    // 記錄接收時間
                    const receiveTime = Date.now();
                    
                    // 計算 RTT（往返時間）
                    const rtt = receiveTime - res.clientTime;
                    
                    // 估算伺服器時間（考慮單程延遲）
                    const estimatedServerTime = res.serverTime + (rtt / 2);
                    
                    // 計算時間偏移量
                    const offset = estimatedServerTime - receiveTime;

                    // 儲存採樣結果
                    samples.push({ rtt, offset });
                    
                    // 採樣間隔 50ms，避免併發封包互相干擾
                    setTimeout(resolve, 50);
                });
            });
        }

        // 按 RTT 排序，選擇網路狀況最佳的採樣
        samples.sort((a, b) => a.rtt - b.rtt);
        const bestSample = samples[0];

        // 更新時間偏移量
        this.serverTimeOffset = bestSample.offset;
        
        console.log(`[SocketManager] 時間同步完成 - 最佳 RTT: ${bestSample.rtt}ms, 時間偏移: ${this.serverTimeOffset}ms`);
    }

    /**
     * 獲取校正後的伺服器時間
     * @returns 校正後的伺服器時間戳記（毫秒）
     */
    public getCorrectedServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }

    /**
     * 發送：修改暱稱
     * @param newNickname 新的暱稱
     */
    public sendUpdateNickname(newNickname: string): void {
        // 防禦性檢查
        if (!this.socket) {
            console.warn('[SocketManager] Socket 未初始化');
            return;
        }

        this.socket.emit('update_nickname', { newNickname }, (response: { success: boolean; nickname?: string; message?: string }) => {
            if (response.success && response.nickname) {
                // 更新成功，同步本地資料
                PlayerData.nickname = response.nickname;
                console.log(`[SocketManager] 暱稱更新成功: ${response.nickname}`);
            } else {
                console.error(`[SocketManager] 暱稱修改失敗: ${response.message}`);
            }
        });
    }

    /**
     * 發送：創建房間
     * @param data 房間資料（房間名稱、角色 ID）
     * @param callback 伺服器回應的回調函數
     */
    public sendCeateRoom(data: { roomName: string; characterId: number }, callback?: (res: any) => void): void {
        this.socket?.emit('create_room', data, callback);
    }

    /**
     * 發送：加入指定房間
     * @param data 加入資料（房間 ID、角色 ID）
     */
    public sendJoinRoom(data: { roomId: string; characterId: number }): void {
        this.socket?.emit('join_room', data, (res: { success: boolean; message?: string }) => {
            if (res && res.success) {
                // 加入成功，開啟房間
                ViewManager.getInstance().openView<RoomView>(ViewType.RoomView, 'HUD').then((roomView) => {
                    // 關閉大廳
                    const lobbyView = ViewManager.getInstance().getView<LobbyView>(ViewType.LobbyView);
                    if (lobbyView) {
                        lobbyView.closeSelf();
                    }
                });
            } else {
                // 加入失敗，顯示錯誤訊息
                console.warn(`[SocketManager] 加入房間失敗: ${res?.message}`);
                ViewManager.getInstance().openView<MessagePopupView>(ViewType.MessagePopupView, "Highest").then(popup => {
                    popup?.setData(res?.message || "加入房間失敗!");
                });
            }
        });
    }

    /**
     * 發送：快速加入房間（自動匹配）
     * @param data 角色資料
     * @param callback 伺服器回應的回調函數
     */
    public sendQuickJoin(data: { characterId: number }, callback?: (res: any) => void): void {
        this.socket?.emit('quick_join', data, callback);
    }

    /**
     * 發送：獲取房間列表
     * @param callback 伺服器回應的回調函數
     */
    public sendGetRoomList(callback?: (res: { success: boolean; rooms: IRoomListData[] }) => void): void {
        this.socket?.emit('get_room_list', callback);
    }

    /**
     * 發送：切換準備狀態
     * @param callback 伺服器回應的回調函數
     */
    public sendToggleReady(callback?: (res: any) => void): void {
        this.socket?.emit('toggle_ready', callback);
    }

    /**
     * 發送：獲取歌曲列表
     * @param callback 伺服器回應的回調函數
     */
    public sendGetSongs(callback?: (res: any) => void): void {
        this.socket.emit('get_songs', callback);
    }

    /**
     * 發送：選擇歌曲（僅房主）
     * @param songId 歌曲 ID
     * @param callback 伺服器回應的回調函數
     */
    public sendSelectSong(songId: string, callback?: (res: any) => void): void {
        this.socket.emit('select_song', { songId: songId }, callback);
    }

    /**
     * 發送：切換角色模型
     * @param characterId 角色編號
     * @param callback 伺服器回應的回調函數
     */
    public sendChangeCharacter(characterId: number, callback?: (res: { success: boolean; characterId?: number }) => void): void {
        this.socket?.emit('change_character', { characterId }, callback);
    }

    /**
     * 發送：修改房間名稱（僅房主）
     * @param newRoomName 新房間名稱
     * @param callback 伺服器回應的回調函數
     */
    public sendUpdateRoomName(newRoomName: string, callback?: (res: { success: boolean; roomName?: string; message?: string }) => void): void {
        this.socket?.emit('update_room_name', { newRoomName }, callback);
    }

    /**
     * 發送：選擇難度（僅房主）
     * @param difficulty 難度枚舉
     * @param callback 伺服器回應的回調函數
     */
    public sendSelectDifficulty(difficulty: DIFFICULTY_TYPE, callback?: (res: { success: boolean; message?: string }) => void): void {
        // 將枚舉轉換為字串
        const difficultyKey = DIFFICULTY_TYPE[difficulty];
        this.socket?.emit('select_difficulty', { difficulty: difficultyKey }, callback);
    }

    /**
     * 發送：踢出玩家（僅房主）
     * @param targetPlayerId 目標玩家 ID
     * @param callback 伺服器回應的回調函數
     */
    public sendKickPlayer(targetPlayerId: string, callback?: (res: any) => void): void {
        this.socket?.emit('kick_player', { targetPlayerId }, callback);
    }

    /**
     * 發送：開始遊戲（僅房主）
     * @param callback 伺服器回應的回調函數
     */
    public sendStartGame(callback?: (res: any) => void): void {
        this.socket?.emit('start_game', callback);
    }

    /**
     * 發送：本地玩家遊戲資源載入完成
     * @param callback 伺服器回應的回調函數
     */
    public sendPrepareGame(callback?: (res: any) => void): void {
        this.socket?.emit('player_loaded', callback);
    }

    /**
     * 發送：主動離開房間
     * @param callback 伺服器回應的回調函數
     */
    public sendLeaveRoom(callback?: (res: any) => void): void {
        this.socket?.emit('leave_room', callback);
    }

    /**
     * 發送：玩家打擊動作
     * @param data 打擊資料（打擊時間、完成數量、譜面長度）
     */
    public sendPlayerHit(data: { hitTime: number, completedCount: number, sequenceLength: number }): void {
        this.socket?.emit('player_hit', data);
    }
}



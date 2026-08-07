import { _decorator, Component, Node, director} from 'cc';
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { SceneLoader } from 'db://assets/Scripts/Manager/SceneLoader';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { MessagePopupView } from 'db://assets/Scripts/View/Common/MessagePopupView';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';

const { ccclass, property } = _decorator;

/**
 * Socket管理中心
 */
@ccclass('SocketManager')
export class SocketManager extends SingletonComponent<SocketManager> {
    private serverUrl: string = 'http://localhost:3000';
    
    public socket: Socket | null = null;
    public playerId: string = '';

    // 伺服器時間 - 本地時間
    public serverTimeOffset: number = 0;

    /**
     * 初始化完成
     */
    private async onInitComplete() {
        // 載入角色資料
        await CharacterDataManager.getInstance().preloadAllCharacters();
        // 切換場景
        SceneLoader.getInstance().loadScene('LobbyScene');
    }

    /**
     * 建立 Socket.IO 連線
     */
    public connectToServer() {
        console.log(`正在嘗試連線至 Server: ${this.serverUrl}`);

        // 初始化 Socket 連線
        this.socket = io(this.serverUrl, {
            transports: ['websocket'], // 指定使用原生的 WebSocket 協議傳輸，效能最好
            reconnection: false,        // 允許自動重連
        });

        // 監聽:"connect"[連線成功]
        this.socket.on('connect', () => {
            console.log(`已成功連接至伺服器！Socket ID: ${this.socket?.id}`);
        });
        
        // 監聽:"disconnect"[斷線]
        this.socket.on('disconnect', (reason: string) => {
            console.warn(`與伺服器斷開連線，原因: ${reason}`);
        });

        // 監聽:"connect_error"[連線錯誤]
        this.socket.on('connect_error', (error: Error) => {
            console.error(`連線伺服器失敗:`, error.message);

            this.onConnectError();
        });

        // 監聽:"init_player"[玩家初始化]
        this.socket.on('init_player', (data: { playerId: string; nickname: string; message: string }) => {
            
            PlayerData.playerId = data.playerId;
            PlayerData.nickname = data.nickname;

            console.log(`[玩家初始化完成] 收到 Server 原始 JSON 資料:\n${JSON.stringify(data, null, 2)}`);
            this.onInitComplete();
        });

        // 監聽:"room_updated" [房間資訊更新]
        this.socket.on('room_updated', (data: IRoomUpdatedData) => {
            console.log(`[Socket 事件] 收到房間更新廣播:`, data);
            // 更新全域房間資料
            RoomData.update(data);
        });

        // 監聽:"kicked_from_room" [被踢出房間]
        this.socket.on('kicked_from_room', (data: { message: string }) => { 
            // 清除房間資料
            RoomData.reset();

            // 彈出提示並切換回大廳 View
            ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                popup?.setData(
                    data.message, 
                    null, 
                    null, 
                    false
                );
            });
        });

        // 監聽:"prepare_game" [準備正式開始遊戲]
        this.socket.on('prepare_game', (data: any) => {
            console.log("收到準備正式開始遊戲");
            RoomData.updateSongs(data);
            SceneLoader.getInstance().loadScene('GameScene');
        });
    }

    /**
     * 連線伺服器失敗
     */
    private async onConnectError() {
        ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
            popup?.setData(
                "連線伺服器失敗!", 
                () => this.connectToServer(), 
                null, 
                false, 
                "重新連接"
            );
        });
    }

    /**
     * 連續對時採樣，選擇 RTT 最小的一組計算 Offset
     * @param sampleCount 採樣次數（預設 5 次）
     */
    public async syncServerTime(sampleCount: number = 5): Promise<void> {
        if (!this.socket) return;

        const samples: { rtt: number; offset: number }[] = [];

        for (let i = 0; i < sampleCount; i++) {
            await new Promise<void>((resolve) => {
                const start = Date.now();
                this.socket!.emit('sync_time', start, (res: { clientTime: number; serverTime: number }) => {
                    const now = Date.now();
                    const rtt = now - res.clientTime;
                    const estimatedServerTime = res.serverTime + (rtt / 2);
                    const offset = estimatedServerTime - now;

                    samples.push({ rtt, offset });
                    
                    // 每採樣一次微小間隔 50ms，避免併發封包干擾
                    setTimeout(resolve, 50);
                });
            });
        }

        // 剔除極端值，選擇 RTT 最低（網路最乾淨）的那次對時結果
        samples.sort((a, b) => a.rtt - b.rtt);
        const bestSample = samples[0];

        this.serverTimeOffset = bestSample.offset;
        console.log(`[精確對時完成] 最佳 RTT: ${bestSample.rtt}ms, 最終時間偏差: ${this.serverTimeOffset}ms`);
    }

    /**
     * 獲取當前校正後的伺服器時間
     */
    public getCorrectedServerTime(): number {
        return Date.now() + this.serverTimeOffset;
    }

    /**
     * 發送:修改暱稱
     * @param newNickname 
     * @returns 
     */
    public sendUpdateNickname(newNickname: string) {
        if (!this.socket) return;

        this.socket.emit('update_nickname', { newNickname }, (response: { success: boolean; nickname?: string; message?: string }) => {
            if (response.success && response.nickname) {
                PlayerData.nickname = response.nickname;
                console.log(`[暱稱修改成功] 新暱稱: ${PlayerData.nickname}`);
            } else {
                console.error(`[暱稱修改失敗]: ${response.message}`);
            }
        });
    }

    /**
     * 發送:創建房間
     */
    public sendCeateRoom(data: { roomName: string; characterId: number }, callback?: (res: any) => void) {
        this.socket?.emit('create_room', data, callback);
    }

    /**
     * 發送:加入指定房間
     */
    public sendJoinRoom(data: { roomId: string; characterId: number }, callback?: (res: any) => void) {
        this.socket?.emit('join_room', data, callback);
    }

    /**
     * 發送:快速加入房間
     */
    public sendQuickJoin(data: { characterId: number }, callback?: (res: any) => void) {
        this.socket?.emit('quick_join', data, callback);
    }
    /**
     * 發送:切換準備狀態
     * @param callback 
     */
    public sendToggleReady(callback?: (res: any) => void) {
        this.socket?.emit('toggle_ready', callback);
    }

    /**
     * 發送:獲取歌單
     * @param callback 
     */
    public sendGetSongs(callback?: (res: any) => void) {
        this.socket.emit('get_songs', callback);
    }

    /**
     * 發送:切換歌曲
     * @param callback 
     */
    public sendSelectSong(songId: string,  callback?: (res: any) => void) {
        console.log(`切換歌曲: ${songId}`);
        this.socket.emit('select_song', { songId: songId }, callback);
    }

    /**
     * 發送：切換角色模型
     * @param characterId 角色模型編號 (int)
     * @param callback 伺服器回應
     */
    public sendChangeCharacter(characterId: number, callback?: (res: { success: boolean; characterId?: number }) => void) {
        this.socket?.emit('change_character', { characterId }, callback);
    }

    /**
     * 發送:修改房間名稱 (僅限房主)
     * @param newRoomName 新房間名稱
     * @param callback 
     */
    public sendUpdateRoomName(newRoomName: string, callback?: (res: { success: boolean; roomName?: string; message?: string }) => void) {
        this.socket?.emit('update_room_name', { newRoomName }, callback);
    }

    /**
     * 發送:踢出玩家(僅限房主)
     * @param targetPlayerId 
     * @param callback 
     */
    public sendKickPlayer(targetPlayerId: string, callback?: (res: any) => void) {
        this.socket?.emit('kick_player', { targetPlayerId }, callback);
    }

    /**
     * 發送:遊戲開始(僅限房主)
     * @param callback 
     */
    public sendStartGame(callback?: (res: any) => void) {
        this.socket?.emit('start_game', callback);
    }

    /**
     * 發送:本地玩家正式遊戲準備完成
     * @param callback 
     */
    public sendPrepareGame(callback?: (res: any) => void) {
        this.socket?.emit('player_loaded', callback);
    }


    /**
     * 發送:主動離開房間
     * @param callback 
     */
    public sendLeaveRoom(callback?: (res: any) => void) {
        this.socket?.emit('leave_room', callback);
    }
}



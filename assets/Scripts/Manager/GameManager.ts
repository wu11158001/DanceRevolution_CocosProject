import { _decorator, Component, Node } from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, BGM_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';
import { SceneLoader } from './SceneLoader';
import { HitNodeView } from '../View/GameScene/HitNodeView';
import { ViewManager } from './ViewManager';
import { GameView } from '../View/GameScene/GameView/GameView';
import { PlayerData } from '../Data/PlayerData';
import { BeatResultVIew } from '../View/GameScene/BeatResultVIew';
import { GameResultView } from '../View/GameScene/GameResultView/GameResultView';

const { ccclass, property } = _decorator;

/**
 * 譜面資料
 */
export interface INoteSequenceData {
    barIndex: number;           // 當前小節
    sequence: string[];         // 箭頭陣列, 例如: ['UP', 'LEFT', 'DOWN', 'RIGHT']
    targetHitTime: number;      // 第 4 拍 Space 鍵的精確伺服器時間點 (ms)
    beatIntervalMs: number;     // 單拍毫秒數 (60000 / BPM)
    barIntervalMs: number;      // 單小節毫秒數 (用於計算表演階段長度)
    progress: number;           // 歌曲進行進度
}

/**
 * 打擊判定資料
 */
export interface IPlayHitResult {
    hitPlayerId: string;            // 打擊玩家 ID
    nickname: string;               // 打擊玩家暱稱
    rating: string;                 // 判定 ('PERFECT' / 'GREAT' / 'GOOD' / 'MISS')
    scoreGained: number;            // 該玩家此拍獲得的分數
    scores: Record<string, number>; // 所有玩家的最新總分對照表{ [playerId]: totalScore }
    danceAnim: string;              // 當前小節舞步動畫名稱
    perfectCombo: number;           // perfect連續次數
}

// 單一玩家的判定統計
export interface IRatingStats {
    PERFECT: number;
    GREAT: number;
    GOOD: number;
    MISS: number;
}

// 單一玩家的遊戲結算成績
export interface IPlayerGameResult {
    playerId: string;         // 玩家 Socket/Player ID
    nickname: string;         // 玩家暱稱
    totalScore: number;       // 總分
    maxPerfectCombo: number;  // 最高 PERFECT 連擊數
    ratings: IRatingStats;    // 各判定累積次數
    isDisconnected: boolean;  // 是否斷線了
}

// 遊戲結束事件發送的全體結算資料
export interface IGameResult {
    roomId: string;
    results: IPlayerGameResult[]; // 依總分排序後的玩家成績陣列
}
/**
 * 遊戲控制中心
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private targetStartTime: number = 0;
    private isWaitingStart: boolean = false;  // 等待音樂倒數啟動標記
    private isGamePlaying: boolean = false;   // 整場遊戲進行中標記

    // 單小節毫秒數
    private barIntervalMs: number = 0;

    private hitNodeView: HitNodeView = null;
    private gameVIew: GameView = null;

    protected onDestroy(): void {
        document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));

        SocketManager.getInstance().socket?.off('game_started');
        SocketManager.getInstance().socket?.off('new_note_sequence');
        SocketManager.getInstance().socket?.off('bar_hit_results');
        SocketManager.getInstance().socket?.off('game_ended');
    }

    protected onLoad(): void {
        // 監聽頁面可見性變化
        document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

        // 監聽:"game_started" [正式遊戲開始]
        SocketManager.getInstance().socket?.on('game_started', this.onGameStarted.bind(this));
        // 監聽:"new_note_sequence" [譜面與打擊時間]
        SocketManager.getInstance().socket?.on('new_note_sequence', this.onNewNodeSequence.bind(this));
        // 監聽:"player_hit_result" [所有玩家打擊判定]
        SocketManager.getInstance().socket?.on('player_hit_result', this.onBarHitResults.bind(this));
        // 監聽:"game_ended" [遊戲結束]
        SocketManager.getInstance().socket?.on('game_ended', this.onGameEnd.bind(this));
    }

    async start() {
        await SocketManager.getInstance().syncServerTime();
        this.hitNodeView = await ViewManager.getInstance().openView<HitNodeView>('HitNodeView', 'Popup');
        this.gameVIew = await ViewManager.getInstance().openView<GameView>('GameView', 'HUD');

        SocketManager.getInstance().sendPrepareGame();
    }

    update(deltaTime: number) {
        if (!this.isWaitingStart) return;

        // 當前校正後的伺服器時間
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        const remainingTime = (this.targetStartTime - currentServerTime) / 1000; // 轉秒

        if (remainingTime <= 0) {
            this.isWaitingStart = false; // 防止重複觸發
            this.playMusicSynchronized(Math.abs(remainingTime));
        }
    }

    /**
     * 切回視窗
     */
    private onVisibilityChange() {
        if (document.visibilityState === 'visible') {
            console.log('[GameManager] 玩家切回視窗，觸發同步與音樂校正...');
            this.resyncGameAndAudio();
        } 
    }

    /**
     * 重新校正伺服器時間差
     * @returns 
     */
    private async resyncGameAndAudio() {
        if (!this.isGamePlaying) return;

        // 重新同步伺服器時間 (計算最新 RTT 與 timeOffset)
        await SocketManager.getInstance().syncServerTime();

        // 執行音樂與遊戲進度強校正
        this.correctAudioPosition();
    }

    /**
     * 執行音樂與遊戲進度強校正
     * @returns 
     */
    private correctAudioPosition() {
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        const song = RoomData.currentSong;
        if (!song) return;

        // 計算音樂理論上應該播放到的位置（秒）
        const songStartTime = this.targetStartTime + (song.offset * 1000);
        const expectedCurrentTimeSec = (currentServerTime - songStartTime) / 1000;

        // 歌曲還沒開始
        if (expectedCurrentTimeSec < 0) {
            return; 
        }

        // 歌曲已經播完了
        if (expectedCurrentTimeSec >= song.duration) {
            AudioManager.getInstance().stopBGM();
            return;
        }

        // 情遊戲進行中，強制將 AudioManager 播放位置跳轉 (Seek) 到 expectedCurrentTimeSec
        console.log(`[切回視窗強校正] 音樂重置並跳轉至: ${expectedCurrentTimeSec.toFixed(3)}s`);
        
        // 重新播放 BGM，並從 expectedCurrentTimeSec 開始播放
        this.playMusicSynchronized(expectedCurrentTimeSec);
    }

    // 接收:遊戲正式開始
    private onGameStarted(data: { song: any; startTime: number }) {
        RoomData.updateSongs(data.song);
        this.targetStartTime = data.startTime;
        this.isGamePlaying = true;
        this.isWaitingStart = true;

        console.log(`[GameManager] 收到開始指令，目標伺服器時間: ${this.targetStartTime}`);
    }

    /**
     * 接收:每小節的譜面與打擊時間資訊
     */
    private onNewNodeSequence(data: INoteSequenceData) {
        this.barIntervalMs = data.barIntervalMs;
        this.hitNodeView.reciveData(data);
    }

    /**
     * 接收:所有玩家打擊判定資料
     */
    private async onBarHitResults(data: IPlayHitResult) {
        this.gameVIew.UpdateScore(data, this.barIntervalMs);               
    }

    /**
     * 接收:遊戲結束
     * @param data 
     */
    private onGameEnd(data: IGameResult) {
        this.gameVIew.onGameOver();

        ViewManager.getInstance().openView<GameResultView>('GameResultView', 'Popup').then((view) => {
            view.setData(data);
        });
    }

    /**
     * 播放音樂時間校對
     */
    private playMusicSynchronized(overshootSeconds: number) {    
        // 安全地取得 BGM_TYPE (確保傳進去的是 Enum 數字而非字串)
        const songId = RoomData.currentSong.id;
        let bgmType: BGM_TYPE;

        if (typeof songId === 'number') {
            bgmType = songId as BGM_TYPE;
        } else {
            // 若 id 是字串如 "Song_0"，需對應至 Enum 數值
            bgmType = BGM_TYPE[songId as keyof typeof BGM_TYPE];
        }

        if (bgmType !== undefined) {
            AudioManager.getInstance().playBGM(
                bgmType,
                1,
                false,
                overshootSeconds,            
            );
        } else {
            console.error(`[GameManager] 無法對應歌曲 BGM_TYPE, songId: ${songId}`);
        }
        
        console.log(`[音樂同步啟動] 修正補償時間: ${overshootSeconds.toFixed(3)}s`);
    }
}
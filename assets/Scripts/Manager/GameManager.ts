import { _decorator, Component, Node } from 'cc';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, BGM_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';
import { SceneLoader } from './SceneLoader';

const { ccclass, property } = _decorator;

// 定義從 Server 接收到的譜面資料格式
export interface INoteSequenceData {
    barIndex: number;
    sequence: string[];
    targetHitTime: number;
    beatIntervalMs: number;
    progress: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
    private targetStartTime: number = 0;
    private isGameStarted: boolean = false;

    protected onDestroy(): void {
        SocketManager.getInstance().socket?.off('game_started');
        SocketManager.getInstance().socket?.off('new_note_sequence');
    }

    protected onLoad(): void {
        // 監聽: 正式遊戲開始
        SocketManager.getInstance().socket?.on('game_started', this.onGameStarted.bind(this));
        // 監聽: 譜面與打擊時間
        SocketManager.getInstance().socket?.on('new_note_sequence', this.onNewNodeSequence.bind(this));
    }

    async start() {
        await SocketManager.getInstance().syncServerTime();
        SocketManager.getInstance().sendPrepareGame();
    }

    update(deltaTime: number) {
        if (!this.isGameStarted) return;

        // 當前校正後的伺服器時間
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        const remainingTime = (this.targetStartTime - currentServerTime) / 1000; // 轉秒

        if (remainingTime <= 0) {
            this.isGameStarted = false; // 防止重複觸發
            this.playMusicSynchronized(Math.abs(remainingTime));
        }
    }

    // 接收: 遊戲正式開始
    private onGameStarted(data: { song: any; startTime: number }) {
        RoomData.updateSongs(data.song);
        this.targetStartTime = data.startTime;
        this.isGameStarted = true;

        console.log(`[GameManager] 收到開始指令，目標伺服器時間: ${this.targetStartTime}`);
    }

    /**
     * 接收: 每小節的譜面與打擊時間資訊
     */
    private onNewNodeSequence(data: INoteSequenceData) {
        console.log(`[GameManager] 收到小節 #${data.barIndex} 譜面:`, data.sequence);

        // 1. 取得校正後的伺服器當前時間
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();

        // 2. 計算倒數時間 (距離第 4 拍 hitTime 還有多少毫秒)
        const timeToHitMs = data.targetHitTime - currentServerTime;

        // 3. 計算前 3 拍的出現時間（若有需要作箭頭逐個登場動畫）
        // 第 1 拍 = targetHitTime - (3 * beatIntervalMs)
        // 第 2 拍 = targetHitTime - (2 * beatIntervalMs)
        // 第 3 拍 = targetHitTime - (1 * beatIntervalMs)
        // 第 4 拍 = targetHitTime (按下 Space)
        const barStartTime = data.targetHitTime - (3 * data.beatIntervalMs);

        // 4. 將資料傳遞給負責渲染 UI / 箭頭節點的管理器 (例如 NoteManager)
        // NoteManager.getInstance().renderBarSequence(data, timeToHitMs);
    }

    /**
     * 播放音樂時間校對
     */
    private playMusicSynchronized(overshootSeconds: number) {        
        SceneLoader.getInstance().closeLoadBg();
        
        const bgmType = BGM_TYPE[RoomData.currentSong.id];
        AudioManager.getInstance().playBGM(
            bgmType,
            1,
            false,
            overshootSeconds,            
        );
        
        console.log(`${RoomData.currentSong.id} | ${bgmType}`);
        console.log(`[音樂同步啟動] 修正補償時間: ${overshootSeconds.toFixed(3)}s`);
    }
}
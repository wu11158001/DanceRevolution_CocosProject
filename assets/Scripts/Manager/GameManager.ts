import { _decorator, Component, Node } from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, BGM_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';
import { SceneLoader } from './SceneLoader';
import { HitNodeView } from '../View/GameScene/HitNodeView';
import { ViewManager } from './ViewManager';

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
}

/**
 * 遊戲控制中心
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private targetStartTime: number = 0;
    private isGameStarted: boolean = false;

    private hitNodeView: HitNodeView = null;

    protected onDestroy(): void {
        SocketManager.getInstance().socket?.off('game_started');
        SocketManager.getInstance().socket?.off('new_note_sequence');
        SocketManager.getInstance().socket?.off('bar_hit_results');
    }

    protected onLoad(): void {
        // 監聽: 正式遊戲開始
        SocketManager.getInstance().socket?.on('game_started', this.onGameStarted.bind(this));
        // 監聽: 譜面與打擊時間
        SocketManager.getInstance().socket?.on('new_note_sequence', this.onNewNodeSequence.bind(this));
        // 監聽: 所有玩家打擊判定
        SocketManager.getInstance().socket?.on('player_hit_result', this.onBarHitResults.bind(this));
    }

    async start() {
        await SocketManager.getInstance().syncServerTime();
        this.hitNodeView = await ViewManager.getInstance().openView<HitNodeView>('HitNodeView', 'Popup')

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

    // 接收:遊戲正式開始
    private onGameStarted(data: { song: any; startTime: number }) {
        RoomData.updateSongs(data.song);
        this.targetStartTime = data.startTime;
        this.isGameStarted = true;

        console.log(`[GameManager] 收到開始指令，目標伺服器時間: ${this.targetStartTime}`);
    }

    /**
     * 接收:每小節的譜面與打擊時間資訊
     */
    private onNewNodeSequence(data: INoteSequenceData) {
        //console.log(`[GameManager] 收到小節 #${data.barIndex} 譜面:`, data.sequence);

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

        this.hitNodeView.reciveData(data);
    }

    /**
     * 接收: 所有玩家打擊判定資料
     */
    private onBarHitResults(data: IPlayHitResult) {
        console.log(`玩家 ${data.nickname} 獲得 ${data.rating}`);

        // 取得打擊玩家的最新總分
        const myScore = data.scores[data.hitPlayerId];

        // 遍歷所有玩家的總分並更新 UI 
        for (const playerId in data.scores) {
            if (Object.prototype.hasOwnProperty.call(data.scores, playerId)) {
                const totalScore = data.scores[playerId];
                //console.log(`玩家 ID: ${playerId}, 當前總分: ${totalScore}`);
                // TODO: 更新對應玩家的分數 UI
            }
        }
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
        
        console.log(`[音樂同步啟動] 修正補償時間: ${overshootSeconds.toFixed(3)}s`);
    }
}
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

/**
 * 遊戲控制中心
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private targetStartTime: number = 0;
    private isGameStarted: boolean = false;

    // 單小節毫秒數
    private barIntervalMs: number = 0;

    private hitNodeView: HitNodeView = null;
    private gameVIew: GameView = null;

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
        this.hitNodeView = await ViewManager.getInstance().openView<HitNodeView>('HitNodeView', 'Popup');
        this.gameVIew = await ViewManager.getInstance().openView<GameView>('GameView', 'HUD');

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
        this.barIntervalMs = data.barIntervalMs;
        this.hitNodeView.reciveData(data);
    }

    /**
     * 接收: 所有玩家打擊判定資料
     */
    private async onBarHitResults(data: IPlayHitResult) {
        this.gameVIew.UpdateScore(data, this.barIntervalMs);               
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
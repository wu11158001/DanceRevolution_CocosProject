import { _decorator, Component, Node, find, director } from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, SFX_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { RoomData } from 'db://assets/Scripts/Data/RoomData';
import { HitNodeView } from '../View/GameScene/HitNodeView';
import { ViewManager } from './ViewManager';
import { GameView } from '../View/GameScene/GameView/GameView';
import { GameResultView } from '../View/GameScene/GameResultView/GameResultView';
import { GameTextTipView } from '../View/GameScene/GameView/GameTextTipView';
import { GameCameraController } from '../Game/GameCameraController';

const { ccclass, property } = _decorator;

/** 譜面個別資料 */
export interface ISequenceData {
    direction: string;      // 箭頭方向
    isReversed: boolean;    // 是否反轉
}

/** 譜面資料 */
export interface INoteSequenceData {
    barIndex: number;               // 當前小節 
    sequence: ISequenceData[];      // 譜面
    targetHitTime: number;          // 目標打擊時間
    beatIntervalMs: number;         // 每拍時間
    barIntervalMs: number;          // 每小節時間
    progress: number;               // 當前音樂進度
}

/** 打擊結果 */
export interface IPlayHitResult {
    hitPlayerId: string;                // 打擊玩家ID
    nickname: string;                   // 打擊玩家暱稱
    rating: string;                     // 打擊結果(PERFECT/ GREAT/GOOD/MISS)
    scoreGained: number;                // 本次分數
    scores: Record<string, number>;     // 所有玩家當前總分對照表
    totalScore: number;                 // 總分
    danceAnim: number;                  // 舞步動畫
    animPhase: number;                  // 舞步動畫階段
    perfectCombo: number;
    completedCount: number;
}

/** 打擊評分 */
export interface IRatingStats {
    PERFECT: number;
    GREAT: number;
    GOOD: number;
    MISS: number;
}

/** 玩家遊戲結算資料 */
export interface IPlayerGameResult {
    playerId: string;
    nickname: string;
    totalScore: number;
    maxPerfectCombo: number;
    ratings: IRatingStats;
    isDisconnected: boolean;
}

/** 遊戲結算資料 */
export interface IGameResult {
    roomId: string;
    results: IPlayerGameResult[];
}

@ccclass('GameManager')
export class GameManager extends Component {
    private targetStartTime: number = 0;
    private isWaitingStart: boolean = false;
    private isGamePlaying: boolean = false;

    private barIntervalMs: number = 0;

    private hitNodeView: HitNodeView = null;
    private gameVIew: GameView = null;
    private gameTextTipView: GameTextTipView = null;
    private gameCameraController: GameCameraController = null;

    private boundVisibilityHandler: () => void = null;

    protected onLoad(): void {
        this.boundVisibilityHandler = this.onVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);

        const socket = SocketManager.getInstance().socket;
        if (socket) {
            socket.on('game_started', this.handleGameStarted);
            socket.on('start_countdown', this.handleStartCount);
            socket.on('new_note_sequence', this.handleNewNodeSequence);
            socket.on('player_hit_result', this.handleBarHitResults);
            socket.on('game_ended', this.handleGameEnd);
        }
    }

    protected onDestroy(): void {
        if (this.boundVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
        }

        const socket = SocketManager.getInstance().socket;
        if (socket) {
            socket.off('game_started', this.handleGameStarted);
            socket.off('start_countdown', this.handleStartCount);
            socket.off('new_note_sequence', this.handleNewNodeSequence);
            socket.off('player_hit_result', this.handleBarHitResults);
            socket.off('game_ended', this.handleGameEnd);
        }
    }

    async start() {
        const gamera3D = find('Camera_3D');
        if (gamera3D) {
            this.gameCameraController = gamera3D.getComponent(GameCameraController);
        }

        await SocketManager.getInstance().syncServerTime();

        // 開啟介面
        const [hitNodeView, gameVIew, gameTextTipView] = await Promise.all([
            ViewManager.getInstance().openView<HitNodeView>('HitNodeView', 'Popup'),
            ViewManager.getInstance().openView<GameView>('GameView', 'HUD'),
            ViewManager.getInstance().openView<GameTextTipView>('GameTextTipView', 'Popup'),
        ]);
        this.hitNodeView = hitNodeView;
        this.gameVIew = gameVIew;
        this.gameTextTipView = gameTextTipView;        

        // 預先載入當前歌曲與常用打擊音效
        await this.preloadGameAudio();

        // 發送:本地玩家準備完成
        SocketManager.getInstance().sendPrepareGame();
    }

    /**
     * 預先載入遊戲本局所需的音樂與打擊音效
     */
    private async preloadGameAudio(): Promise<void> {
        const song = RoomData.currentSong;
        const preloadTasks: Promise<boolean>[] = [];

        // 預載歌曲 BGM
        if (song && song.id) {
            preloadTasks.push(AudioManager.getInstance().preloadBGM(song.id));
        }

        // 預載遊戲核心打擊音效
        preloadTasks.push(AudioManager.getInstance().preloadSFX(SFX_TYPE.BeatPerfect));
        preloadTasks.push(AudioManager.getInstance().preloadSFX(SFX_TYPE.BeatNromal));
        preloadTasks.push(AudioManager.getInstance().preloadSFX(SFX_TYPE.BeatMiss));
        preloadTasks.push(AudioManager.getInstance().preloadSFX(SFX_TYPE.Cheer));
        preloadTasks.push(AudioManager.getInstance().preloadSFX(SFX_TYPE.Ready));

        console.log('[GameManager] 開始預載遊戲音訊資源...');
        await Promise.all(preloadTasks);
        console.log('[GameManager] 遊戲音訊資源預載完成！');
    }

    update(deltaTime: number) {
        if (!this.isWaitingStart) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        if (currentServerTime >= this.targetStartTime) {
            this.isWaitingStart = false;

            const overshootMs = currentServerTime - this.targetStartTime;
            const overshootSeconds = overshootMs / 1000;

            director.emit('REQ_CLOSE_LOAD_BG');
            
            if (this.gameCameraController) {
                this.gameCameraController.onGameOpening(this.gameTextTipView);
            }
            
            this.playMusicSynchronized(overshootSeconds);
        }
    }

    /**
     * 視窗切換
     */
    private onVisibilityChange() {
        console.log('[GameManager] 視窗切換，觸發同步與音樂校正...');
        this.resyncGameAndAudio();
    }

    /**
     * 同步與音樂校正
     * @returns 
     */
    private async resyncGameAndAudio() {
        if (!this.isGamePlaying) return;

        await SocketManager.getInstance().syncServerTime();
        this.correctAudioPosition();
    }

    /**
     * 音樂校正
     * @returns 
     */
    private correctAudioPosition() {
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        const song = RoomData.currentSong;
        if (!song) return;

        const expectedCurrentTimeSec = (currentServerTime - this.targetStartTime) / 1000;

        if (expectedCurrentTimeSec < 0) return; 

        if (expectedCurrentTimeSec >= song.duration) {
            AudioManager.getInstance().stopBGM();
            return;
        }

        console.log(`[切回視窗/強校正] 音樂重置並跳轉至: ${expectedCurrentTimeSec.toFixed(3)}s`);
        this.playMusicSynchronized(expectedCurrentTimeSec);

        this.handleTimeOutBackGame();
    }

    /**
     * 超時回到遊戲
     */
    private handleTimeOutBackGame() {
        if(this.isWaitingStart || 
        (this.gameCameraController && !this.gameCameraController.isRoutineFinish)) 
        {
            this.isWaitingStart = false;
            director.emit('REQ_CLOSE_LOAD_BG');
            this.gameCameraController.onShowGameUI();
        }
    }

    /**
     * 接收:遊戲開始
     * @param data 
     * @returns 
     */
    private handleGameStarted = (data: { song: any; startTime: number }) => {
        if (!this.node || !this.node.isValid) return;

        RoomData.updateSongs(data.song);
        this.targetStartTime = data.startTime;
        this.isGamePlaying = true;
        this.isWaitingStart = true;

        console.log(`[GameManager] 收到開始指令，目標伺服器時間: ${this.targetStartTime}`);
    };

    /**
     * 接收:譜面首次發送倒數
     * @param data 
     * @returns 
     */
    private handleStartCount = (data: { countdownSec: number, sequence: string[] }) => {
        if (!this.node || !this.node.isValid) return;

        // 超時或強行開始時，若 Loading 畫面還開著，強制關閉
        this.handleTimeOutBackGame();

        // 安全檢查：避免 View 未加載完畢造成 null 報錯
        if (this.gameTextTipView) {
            this.gameTextTipView.onStartCount(data);
        } else {
            console.warn('[GameManager] gameTextTipView 尚未準備完成，略過本次倒數顯示');
        }
    };

    /**
     * 接收:新譜面
     * @param data 
     * @returns 
     */
    private handleNewNodeSequence = (data: INoteSequenceData) => {
        if (!this.node || !this.node.isValid) return;

        // 超時或強行開始時，若 Loading 畫面還開著，強制關閉
        this.handleTimeOutBackGame();

        this.barIntervalMs = data.barIntervalMs;
        if (this.hitNodeView) {
            this.hitNodeView.reciveData(data);
        }
    };

    /**
     * 接收:打擊評分結果
     * @param data 
     * @returns 
     */
    private handleBarHitResults = async (data: IPlayHitResult) => {
        if (!this.node || !this.node.isValid) return;

        if (this.gameVIew) {
            this.gameVIew.UpdateScore(data, this.barIntervalMs);
        }
    };

    /**
     * 接收:遊戲結束
     * @param data 
     * @returns 
     */
    private handleGameEnd = async (data: IGameResult) => {
        if (!this.node || !this.node.isValid) return;

        if (this.gameVIew) {
            this.gameVIew.onGameOver();
        }

        await new Promise(resolve => setTimeout(resolve, 2500));

        AudioManager.getInstance().playSFX(SFX_TYPE.Cheer);
        ViewManager.getInstance().openView<GameResultView>('GameResultView', 'Popup').then((view) => {
            if (view) view.setData(data);
        });

        if (this.gameTextTipView) {
            this.gameTextTipView.onGameFinish();
        }
    };

    /**
     * 音樂同步
     * @param overshootSeconds 
     * @returns 
     */
    private playMusicSynchronized(overshootSeconds: number) {
        const song = RoomData.currentSong;
        if (!song) return;

        if (song.id !== undefined) {
            AudioManager.getInstance().playBGM(
                song.id,
                0.85,
                false,
                overshootSeconds,            
            );
        } else {
            console.error(`[GameManager] 無法對應歌曲 BGM_TYPE, songId: ${song.id}`);
        }
        
        console.log(`[音樂同步啟動] 修正補償時間: ${overshootSeconds.toFixed(3)}s`);
    }
}
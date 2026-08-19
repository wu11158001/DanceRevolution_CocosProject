import { _decorator, Component, Node, find } from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, BGM_TYPE, SFX_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { RoomData } from 'db://assets/Scripts/Data/RoomData';
import { SceneLoader } from './SceneLoader';
import { HitNodeView } from '../View/GameScene/HitNodeView';
import { ViewManager } from './ViewManager';
import { GameView } from '../View/GameScene/GameView/GameView';
import { GameResultView } from '../View/GameScene/GameResultView/GameResultView';
import { GameTextTipView } from '../View/GameScene/GameView/GameTextTipView';
import { GameCameraController } from '../Game/GameCameraController';

const { ccclass, property } = _decorator;

export interface ISequenceData {
    direction: string;
    isReversed: boolean;
}

export interface INoteSequenceData {
    barIndex: number;
    sequence: ISequenceData[];
    targetHitTime: number;
    beatIntervalMs: number;
    barIntervalMs: number;
    progress: number;
}

export interface IPlayHitResult {
    hitPlayerId: string;
    nickname: string;
    rating: string;
    scoreGained: number;
    scores: Record<string, number>;
    totalScore: number;
    danceAnim: number;
    animPhase: number;
    perfectCombo: number;
    completedCount: number;
}

export interface IRatingStats {
    PERFECT: number;
    GREAT: number;
    GOOD: number;
    MISS: number;
}

export interface IPlayerGameResult {
    playerId: string;
    nickname: string;
    totalScore: number;
    maxPerfectCombo: number;
    ratings: IRatingStats;
    isDisconnected: boolean;
}

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

    // 保存 visibilitychangeListener 實例以便註銷
    private boundVisibilityHandler: () => void = null;

    protected onLoad(): void {
        this.boundVisibilityHandler = this.onVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this.boundVisibilityHandler);

        // ✅ 使用箭頭函式（Arrow Functions）綁定 Socket 事件，確保 onDestroy 時能精確清理
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

        // ✅ 精確註銷 Socket 事件監聽器，防止超時/重連時舊元件被調用
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

        const [hitNodeView, gameVIew, gameTextTipView] = await Promise.all([
            ViewManager.getInstance().openView<HitNodeView>('HitNodeView', 'Popup'),
            ViewManager.getInstance().openView<GameView>('GameView', 'HUD'),
            ViewManager.getInstance().openView<GameTextTipView>('GameTextTipView', 'Popup'),
        ]);
        this.hitNodeView = hitNodeView;
        this.gameVIew = gameVIew;
        this.gameTextTipView = gameTextTipView;        

        SocketManager.getInstance().sendPrepareGame();
    }

    update(deltaTime: number) {
        if (!this.isWaitingStart) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        if (currentServerTime >= this.targetStartTime) {
            this.isWaitingStart = false;

            const overshootMs = currentServerTime - this.targetStartTime;
            const overshootSeconds = overshootMs / 1000;

            SceneLoader.getInstance().closeLoadBg();
            
            if (this.gameCameraController) {
                this.gameCameraController.onGameOpening(this.gameTextTipView);
            }
            
            this.playMusicSynchronized(overshootSeconds);
        }
    }

    private onVisibilityChange() {
        console.log('[GameManager] 玩家視窗切換，觸發同步與音樂校正...');
        this.resyncGameAndAudio();
    }

    private async resyncGameAndAudio() {
        if (!this.isGamePlaying) return;

        await SocketManager.getInstance().syncServerTime();
        this.correctAudioPosition();
    }

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
    }

    // ==========================================
    // 網路事件 Handling (防護處理 + 箭頭函式綁定)
    // ==========================================

    private handleGameStarted = (data: { song: any; startTime: number }) => {
        if (!this.node || !this.node.isValid) return;

        RoomData.updateSongs(data.song);
        this.targetStartTime = data.startTime;
        this.isGamePlaying = true;
        this.isWaitingStart = true;

        console.log(`[GameManager] 收到開始指令，目標伺服器時間: ${this.targetStartTime}`);
    };

    private handleStartCount = (data: { countdownSec: number, sequence: string[] }) => {
        if (!this.node || !this.node.isValid) return;

        // 超時或強行開始時，若 Loading 畫面還開著，強制關閉
        SceneLoader.getInstance().closeLoadBg();

        // 安全檢查：避免 View 未加載完畢造成 null 報錯
        if (this.gameTextTipView) {
            this.gameTextTipView.onStartCount(data);
        } else {
            console.warn('[GameManager] gameTextTipView 尚未準備完成，略過本次倒數顯示');
        }
    };

    private handleNewNodeSequence = (data: INoteSequenceData) => {
        if (!this.node || !this.node.isValid) return;

        // 超時或強行開始時，若 Loading 畫面還開著，強制關閉
        SceneLoader.getInstance().closeLoadBg();

        this.barIntervalMs = data.barIntervalMs;
        if (this.hitNodeView) {
            this.hitNodeView.reciveData(data);
        }
    };

    private handleBarHitResults = async (data: IPlayHitResult) => {
        if (!this.node || !this.node.isValid) return;

        if (this.gameVIew) {
            this.gameVIew.UpdateScore(data, this.barIntervalMs);
        }
    };

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

    private playMusicSynchronized(overshootSeconds: number) {    
        const song = RoomData.currentSong;
        if (!song) return;

        const songId = song.id;
        let bgmType: BGM_TYPE;

        if (typeof songId === 'number') {
            bgmType = songId as BGM_TYPE;
        } else {
            bgmType = BGM_TYPE[songId as keyof typeof BGM_TYPE];
        }

        if (bgmType !== undefined) {
            AudioManager.getInstance().playBGM(
                bgmType,
                0.85,
                false,
                overshootSeconds,            
            );
        } else {
            console.error(`[GameManager] 無法對應歌曲 BGM_TYPE, songId: ${songId}`);
        }
        
        console.log(`[音樂同步啟動] 修正補償時間: ${overshootSeconds.toFixed(3)}s`);
    }
}
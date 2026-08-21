import { _decorator, Component, instantiate, Label, Node, ProgressBar, tween, Vec3, v3, Camera, find, director, Color, Tween } from 'cc';
import { BaseView } from '../../BaseView';
import { AudioManager } from '../../../Manager/AudioManager';
import { RoomData } from '../../../Data/RoomData';
import { ScoreItem } from './ScoreItem';
import { IGameResult, IPlayHitResult } from '../../../Manager/GameManager';
import { PlayerData } from '../../../Data/PlayerData';
import { GameTool } from '../../../Tools/GameTool';
import { CharacterDataManager } from '../../../Manager/CharacterDataManager';
import { CharacterControl } from '../../../Game/CharacterControl';
import { ViewManager, ViewType } from '../../../Manager/ViewManager';
import { BeatResultView } from '../BeatResultVIew';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';

const { ccclass, property } = _decorator;

/** 玩家分數排序 */
interface IPlayerScoreSort {
    playerId: string;
    score: number;
}

/**
 * 遊戲介面
 */
@ccclass('GameView')
export class GameView extends BaseView {
    @property(Label)
    private label_selfScore: Label = null;

    @property(Node)
    private allScorePanel: Node = null;
    @property(Node)
    private scoreItemPrefab: Node = null;

    @property(FixedMarqueeText)
    private songNameMarquee: FixedMarqueeText = null;
    @property(ProgressBar)
    private progressBar_song: ProgressBar = null;
    @property(Label)
    private label_songTimeLeft: Label = null;

    @property(Node)
    private nicknameNode: Node = null;
    @property(Node)
    private nicknamePrefab: Node = null;
    @property([Color])
    private nicknameColors: Color[] = []; // 0=自己, 1=其他玩家

    @property(Node)
    private selfTarget: Node = null;

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(0, 0, 1.5), 
        new Vec3(-1.5, 0, 0), 
        new Vec3(1.5, 0, -0.5), 
        new Vec3(-2.8, 0, -1), 
    ];

    private nicknamePosOffset = v3(0, 0.32, 0);
    private selfTargetPosOffest = v3(0, 0.45, 0);

    private camera3D: Camera = null;

    private selfCharacter: CharacterControl = null;
    private nicknameMap: Map<CharacterControl, Node> = new Map();
    private characterMap: Map<string, CharacterControl> = new Map();
    private scoreNodeMap: Map<string, ScoreItem> = new Map();

    private playerSeatMap: Map<string, number> = new Map();
    private seatTweenMap: Map<string, Tween<Node>> = new Map();
    private scoreTweenMap: Map<string, Tween<any>> = new Map();

    private isGameOver: boolean = false;

    private songProgressTimer: number = 0;
    private lastTimeString: string = "";
    private currentSelfScoreNum: number = 0;
    private sortedPlayersCache: IPlayerScoreSort[] = [];

    public async onOpen(params?: any) {
        super.onOpen(params);

        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;

        this.nicknamePrefab.active = false;

        this.currentSelfScoreNum = 0;
        this.label_selfScore.string = '0';
        this.songNameMarquee.setTitle(`${RoomData.currentSong.name} (BPM:${RoomData.currentSong.bpm})`);

        this.progressBar_song.progress = 0;
        this.label_songTimeLeft.string = "00:00";

        this.createCharacter();
        this.createAllScoreNode();
    }

    protected lateUpdate(dt: number): void {
        this.updateSongProgress(dt);
        this.updateNicknamePos(dt);
        this.updateSelfTargetPos(dt);
    } 

    /**
     * 更新音樂進度
     */
    private updateSongProgress(dt: number) {
        if (this.isGameOver) return;

        this.songProgressTimer += dt;
        if (this.songProgressTimer >= 1) {
            this.songProgressTimer = 0;

            const audioMgr = AudioManager.getInstance();
            this.progressBar_song.progress = audioMgr.getSongTimeLeftProgress();
            
            const timeLeftStr = audioMgr.getSongTimeLeft();
            if (this.lastTimeString !== timeLeftStr) {
                this.lastTimeString = timeLeftStr;
                this.label_songTimeLeft.string = timeLeftStr;
            }
        }
    }

    /**
     * 更新本地玩家指標位置
     */
    private updateSelfTargetPos(dt: number) {
        if (!this.selfCharacter || !this.camera3D || !this.selfTarget) return;

        GameTool.getInstance().follow3DNode(
            this.camera3D,
            this.selfCharacter.model3D,
            this.selfTarget,
            this.selfTargetPosOffest,
            dt,
            30,
            false
        );
    }

    /**
     * 更新暱稱位置
     */
    private updateNicknamePos(dt: number) {
        if (!this.camera3D) return;

        this.nicknameMap.forEach((nicknameNode, character) => {
            GameTool.getInstance().follow3DNode(
                this.camera3D,
                character.model3D,
                nicknameNode,
                this.nicknamePosOffset,
                dt,
                30,
                false
            );
        });    
    }

    /**
     * 創建角色
     */
    private createCharacter() {
        const currentScene = director.getScene();

        RoomData.players.forEach((player, index) => {
            const character = CharacterDataManager.getInstance().create(player.characterId);
            if (!character) return;

            if (currentScene) {
                currentScene.addChild(character);
                character.setPosition(this.characterSeatPos[index]);
            }

            this.playerSeatMap.set(player.playerId, index);

            const characterControl = character.getComponent(CharacterControl);
            if (characterControl) {
                characterControl.playAnimation('Idle', 0, false);
                this.characterMap.set(player.playerId, characterControl);

                const nicknameObj = instantiate(this.nicknamePrefab);
                nicknameObj.active = true;
                nicknameObj.setParent(this.nicknameNode);

                const nicknameLabel = nicknameObj.getComponent(Label);
                if (nicknameLabel) {
                    nicknameLabel.string = player.nickname;
                    nicknameLabel.color = player.playerId === PlayerData.playerId ? this.nicknameColors[0] : this.nicknameColors[1];
                    this.nicknameMap.set(characterControl, nicknameObj);
                }
            }

            if (player.playerId === PlayerData.playerId) {
                this.selfCharacter = characterControl;
            }
        });
    }

    /**
     * 創建所有玩家分數UI
     */
    private createAllScoreNode() {
        this.scoreItemPrefab.active = false;

        RoomData.players.forEach((player, index) => {
            const obj = instantiate(this.scoreItemPrefab);
            obj.active = true;
            obj.setParent(this.allScorePanel);

            const scoreItem = obj.getComponent(ScoreItem);
            if (scoreItem) {
                const isLocal = player.playerId === PlayerData.playerId;
                scoreItem.setData(player.nickname);
                scoreItem.updateIcon(index === 0, isLocal);
                this.scoreNodeMap.set(player.playerId, scoreItem);
            }
        });
    }

    /**
     * 更新分數
     */
    public UpdateScore(data: IPlayHitResult, barIntervalMs: number) {
        if (!data || !data.scores) return;

        // 角色動畫撥放
        const hitCharacter = this.characterMap.get(data.hitPlayerId);
        if (hitCharacter) {
            if (data.rating === 'MISS') hitCharacter.playAnimation('DanceMiss', barIntervalMs * 2);
            else hitCharacter.playDanceAnimation(data.danceAnim, data.animPhase, barIntervalMs * 8);
        }

        // 排序
        this.sortedPlayersCache.length = 0;
        for (const pId in data.scores) {
            this.sortedPlayersCache.push({ playerId: pId, score: data.scores[pId] });
        }
        this.sortedPlayersCache.sort((a, b) => b.score - a.score);

        // 第一名交換位置
        if (this.sortedPlayersCache.length > 0) {
            const currentRank1PlayerId = this.sortedPlayersCache[0].playerId;
            
            let oldRank1PlayerId: string | null = null;
            this.playerSeatMap.forEach((seatIndex, pId) => {
                if (seatIndex === 0) oldRank1PlayerId = pId;
            });

            if (oldRank1PlayerId && currentRank1PlayerId !== oldRank1PlayerId) {
                const newRank1Seat = 0;
                const oldRank1Seat = this.playerSeatMap.get(currentRank1PlayerId)!;

                this.playerSeatMap.set(currentRank1PlayerId, newRank1Seat);
                this.playerSeatMap.set(oldRank1PlayerId, oldRank1Seat);

                this.moveCharacterToSeat(currentRank1PlayerId, newRank1Seat);
                this.moveCharacterToSeat(oldRank1PlayerId, oldRank1Seat);
            }
        }

        // 依照排序結果更新分數與 UI 層級順序
        const gameTool = GameTool.getInstance();
        this.sortedPlayersCache.forEach((item, index) => {
            const scoreNode = this.scoreNodeMap.get(item.playerId);
            if (scoreNode) {
                const startScore = scoreNode.currentScore || 0;
                const animObj = { value: startScore };

                // 停掉舊的分數 Tween
                const scoreTweenKey = `score_${item.playerId}`;
                if (this.scoreTweenMap.has(scoreTweenKey)) {
                    this.scoreTweenMap.get(scoreTweenKey).stop();
                }

                const tw = tween(animObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            scoreNode.updateScore(gameTool.formatNumber(animObj.value));
                        }
                    })
                    .call(() => this.scoreTweenMap.delete(scoreTweenKey))
                    .start();

                this.scoreTweenMap.set(scoreTweenKey, tw);

                const isLocal = item.playerId === PlayerData.playerId;
                const isFirstPlace = index === 0;

                scoreNode.currentScore = item.score;
                scoreNode.updateIcon(isFirstPlace, isLocal);
                scoreNode.node.setSiblingIndex(index);
            }
            
            // 本地玩家個人總分
            if (item.playerId === PlayerData.playerId && this.label_selfScore) {
                const selfTweenKey = 'self_score';
                if (this.scoreTweenMap.has(selfTweenKey)) {
                    this.scoreTweenMap.get(selfTweenKey).stop();
                }

                const selfAnimObj = { value: this.currentSelfScoreNum };
                const twSelf = tween(selfAnimObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            this.currentSelfScoreNum = selfAnimObj.value;
                            this.label_selfScore.string = gameTool.formatNumber(selfAnimObj.value);
                        }
                    })
                    .call(() => this.scoreTweenMap.delete(selfTweenKey))
                    .start();

                this.scoreTweenMap.set(selfTweenKey, twSelf);
            }
        });

        // 顯示打擊結果介面        
        ViewManager.getInstance().openView<BeatResultView>(ViewType.BeatResultView, 'Popup', false).then(beatResultVIew => {
            const isSelf = data.hitPlayerId === PlayerData.playerId;
            if (hitCharacter && beatResultVIew) {
                beatResultVIew.showResult(data.rating, data.perfectCombo, isSelf, hitCharacter.node);
            }
        });
    }

    /**
     * 角色移動至指定的座位
     */
    private moveCharacterToSeat(playerId: string, targetSeatIndex: number) {
        const characterCtrl = this.characterMap.get(playerId);
        if (!characterCtrl) return;

        const targetPos = this.characterSeatPos[targetSeatIndex];
        if (!targetPos) return;

        if (this.seatTweenMap.has(playerId)) {
            this.seatTweenMap.get(playerId).stop();
        }

        const tw = tween(characterCtrl.node)
            .to(0.5, { position: targetPos }, { easing: 'linear' })
            .call(() => {
                this.seatTweenMap.delete(playerId);
            })
            .start();

        this.seatTweenMap.set(playerId, tw);
    }

    /**
     * 遊戲結束
     */
    public onGameOver() {
        this.isGameOver = true;
        this.progressBar_song.progress = 1;
        this.label_songTimeLeft.string = '00:00';

        this.characterMap.forEach((character) => {
            character.playAnimation('Idle');
        });
    }

    /**
     * 介面關閉時清理所有 Tween
     */
    public onClose() {
        this.seatTweenMap.forEach(tw => tw.stop());
        this.seatTweenMap.clear();

        this.scoreTweenMap.forEach(tw => tw.stop());
        this.scoreTweenMap.clear();

        super.onClose();
    }
}
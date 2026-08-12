import { _decorator, Component, instantiate, Label, Node, ProgressBar, tween, Vec3, v3, Camera, find, director, Button} from 'cc';

import { BaseView } from '../../BaseView';
import { AudioManager } from '../../../Manager/AudioManager';
import { RoomData } from '../../../Data/RoomData';
import { ScoreItem } from './ScoreItem';
import { IGameResult, IPlayHitResult } from '../../../Manager/GameManager';
import { PlayerData } from '../../../Data/PlayerData';
import { GameTool } from '../../../Tools/GameTool';
import { CharacterDataManager } from '../../../Manager/CharacterDataManager';
import { CharacterControl } from '../../../Game/CharacterControl';
import { ViewManager } from '../../../Manager/ViewManager';
import { BeatResultVIew } from '../BeatResultVIew';
import { SceneLoader } from '../../../Manager/SceneLoader';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';

const { ccclass, property } = _decorator;

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

    @property(Node)
    private selfTarget: Node = null;

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(0, 0, 1.5), 
        new Vec3(-1.5, 0, 0), 
        new Vec3(1.5, 0, -0.5), 
        new Vec3(-2.8, 0, -1), 
    ];

    private nicknamePosOffset = v3(0, -0.15, 0);
    private selfTargetPosOffest = v3(0, 1.85, 0);

    private camera3D: Camera = null;

    private selfCharacterNode: Node = null;
    private nicknameMap: Map<CharacterControl, Node> = new Map();
    private characterMap: Map<string, CharacterControl> = new Map();
    private scoreNodeMap: Map<string, ScoreItem> = new Map();

    private playerSeatMap: Map<string, number> = new Map();
    private seatTweenMap: Map<string, any> = new Map();

    private isStart: boolean = false;
    private isGameOver: boolean = false;

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 尋找3D相機
        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;

        this.nicknamePrefab.active = false;

        this.label_selfScore.string = '0';
        this.songNameMarquee.setTitle(`${RoomData.currentSong.name} (BPM:${RoomData.currentSong.bpm})`);

        this.progressBar_song.progress = 0;
        this.label_songTimeLeft.string = "00:00";

        this.createCharacter();
        this.createAllScoreNode();
    }

    update(dt: number) {
        this.updateSongProgress();
        this.updateNicknamePos();
        this.updateSelfTargetPos();
    }

    /**
     * 更新音樂進度
     */
    private updateSongProgress() {
        if(AudioManager.getInstance().getSongTimeLeftProgress() > 0 && !this.isStart) {
            this.isStart = true;
            SceneLoader.getInstance().closeLoadBg();
        }

        if(!this.isGameOver) {
            this.progressBar_song.progress = AudioManager.getInstance().getSongTimeLeftProgress();
            this.label_songTimeLeft.string = AudioManager.getInstance().getSongTimeLeft();
        }
    }

    /**
     * 更新本地玩家指標位置
     */
    private updateSelfTargetPos() {
        GameTool.getInstance().follow3DNode(
            this.camera3D,
            this.selfCharacterNode,
            this.selfTarget,
            this.selfTargetPosOffest
        );
    }

    /**
     * 更新暱稱位置
     */
    private updateNicknamePos() {
        this.nicknameMap.forEach((nicknameNode, character) => {
            GameTool.getInstance().follow3DNode(
                this.camera3D,
                character.node,
                nicknameNode,
                this.nicknamePosOffset
            );
        });    
    }

    /**
     * 創建角色
     */
    private createCharacter() {
        RoomData.players.forEach((player, index) => {
            const character = CharacterDataManager.getInstance().create(player.characterId);
            if(character) {
                const currentScene = director.getScene();
                if (currentScene) {
                    currentScene.addChild(character);
                    character.setPosition(this.characterSeatPos[index]);
                }

                // 初始化記錄玩家初始座位
                this.playerSeatMap.set(player.playerId, index);

                let characterControl = character.getComponent(CharacterControl);
                if(characterControl) {
                    this.characterMap.set(player.playerId, characterControl);

                    let nicknameObj = instantiate(this.nicknamePrefab);
                    nicknameObj.active = true;
                    nicknameObj.setParent(this.nicknameNode);
                    let nicknameLabel = nicknameObj.getComponent(Label);
                    if(nicknameLabel) {
                        nicknameLabel.string = player.nickname;
                        this.nicknameMap.set(characterControl, nicknameObj);
                    }
                }

                // 本地玩家角色
                if(player.playerId == PlayerData.playerId) {
                    this.selfCharacterNode = character;
                }
            }
        });
    }

    /**
     * 創建所有玩家分數UI
     */
    private createAllScoreNode() {
        this.scoreItemPrefab.active = false;

        RoomData.players.forEach((player, index) => {
            let obj = instantiate(this.scoreItemPrefab);
            obj.active = true;
            obj.setParent(this.allScorePanel);

            let scoreItem = obj.getComponent(ScoreItem);
            if(scoreItem) {
                const isLocal = player.playerId == PlayerData.playerId;

                scoreItem.setData(player.nickname);
                scoreItem.updateIcon(index == 0, isLocal);
                this.scoreNodeMap.set(player.playerId, scoreItem);
            }
        });
    }

    /**
     * 更新分數
     * @param data 
     */
    public UpdateScore(data: IPlayHitResult, barIntervalMs: number) {
        if (!data || !data.scores) return;

        // 角色動畫撥放
        const hitCharacter = this.characterMap.get(data.hitPlayerId);
        if(hitCharacter) {
            if(data.rating == 'MISS') hitCharacter.playAnimation('DanceMiss', barIntervalMs * 2);
            else hitCharacter.playDanceAnimation(data.danceAnim, data.animPhase, barIntervalMs * 4);
        }

        // 轉為陣列並依分數「由高到低」排序
        const sortedPlayers = Object.keys(data.scores)
            .map(playerId => ({
                playerId: playerId,
                score: data.scores[playerId]
            }))
            .sort((a, b) => b.score - a.score);

        // 第一名交換位置
        if (sortedPlayers.length > 0) {
            const currentRank1PlayerId = sortedPlayers[0].playerId; // 當前最高分的玩家 ID
            
            // 找出原本在第 0 個位置（第一名）的玩家 ID
            let oldRank1PlayerId: string | null = null;
            this.playerSeatMap.forEach((seatIndex, pId) => {
                if (seatIndex === 0) {
                    oldRank1PlayerId = pId;
                }
            });

            // 如果當前第一名不是原本的第一名，進行交換
            if (oldRank1PlayerId && currentRank1PlayerId !== oldRank1PlayerId) {
                const newRank1Seat = 0; // 第一名位置
                const oldRank1Seat = this.playerSeatMap.get(currentRank1PlayerId)!; // 新第一名原本的位置

                // 更新內部 Seat Map 紀錄
                this.playerSeatMap.set(currentRank1PlayerId, newRank1Seat);
                this.playerSeatMap.set(oldRank1PlayerId, oldRank1Seat);

                // 讓新第一名 Tween 移動到 characterSeatPos[0]
                this.moveCharacterToSeat(currentRank1PlayerId, newRank1Seat);

                // 讓舊第一名 Tween 移動到新第一名原本的位置
                this.moveCharacterToSeat(oldRank1PlayerId, oldRank1Seat);
            }
        }

        // 依照排序結果更新分數與 UI 層級順序
        sortedPlayers.forEach((item, index) => {
            const scoreNode = this.scoreNodeMap.get(item.playerId);
            if (scoreNode) {
                const startScore = scoreNode.currentScore || 0;
                const animObj = { value: startScore };

                tween(animObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            scoreNode.updateScore(GameTool.getInstance().formatNumber(animObj.value));
                        }
                    })
                    .start();

                const isLocal = item.playerId === PlayerData.playerId;
                const isFirstPlace = index == 0;

                scoreNode.currentScore = item.score;
                scoreNode.updateIcon(isFirstPlace, isLocal);
                scoreNode.node.setSiblingIndex(index);
            }
            
            // 本地玩家個人總分
            if (item.playerId === PlayerData.playerId && this.label_selfScore) {
                const currentSelfScore = parseInt(this.label_selfScore.string.replace(/,/g, ''), 10) || 0;
                const selfAnimObj = { value: currentSelfScore };

                tween(selfAnimObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            this.label_selfScore.string = GameTool.getInstance().formatNumber(selfAnimObj.value);
                        }
                    })
                    .start();
            }
        });

        // 顯示打擊結果介面        
        ViewManager.getInstance().openView<BeatResultVIew>('BeatResultVIew', 'Popup', false).then(beatResultVIew => {
            const isSelf = data.hitPlayerId == PlayerData.playerId;
            if (hitCharacter) {
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

        // 如果該角色已有正在進行的位移動畫，先停止
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
}
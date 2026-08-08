import { _decorator, Component, instantiate, Label, Node, ProgressBar, tween, Vec3, v3, Camera, find, director} from 'cc';

import { BaseView } from '../../BaseView';
import { AudioManager } from '../../../Manager/AudioManager';
import { RoomData } from '../../../Data/RoomData';
import { ScoreNodePrefab } from './scoreNodePrefab';
import { IPlayHitResult } from '../../../Manager/GameManager';
import { PlayerData } from '../../../Data/PlayerData';
import { GameTool } from '../../../Tools/GameTool';
import { CharacterDataManager } from '../../../Manager/CharacterDataManager';
import { CharacterControl } from '../../../Game/CharacterControl';

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
    private scoreNodePrefabNode: Node = null;

    @property(Label)
    private label_songName: Label = null;
    @property(ProgressBar)
    private progressBar_song: ProgressBar = null;
    @property(Label)
    private label_songTimeLeft: Label = null;

    @property(Node)
    private nicknameNode: Node = null;
    @property(Node)
    private nicknamePrefab: Node = null;

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(-0.5, 0.1, 0), 
        new Vec3(0.5, 0.1, 0), 
        new Vec3(-1.5, 0.1, 0), 
        new Vec3(1.5, 0.1, 0), 
    ];

    private nicknamePosOffset = v3(0, -50, 0);

    private camera3D: Camera = null;

    private nicknameMap: Map<CharacterControl, Node> = new Map();
    private characterMap: Map<string, CharacterControl> = new Map();
    private scoreNodeMap: Map<string, ScoreNodePrefab> = new Map();

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 尋找3D相機
        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;

        this.nicknamePrefab.active = false;

        this.label_selfScore.string = '0';
        this.label_songName.string = RoomData.currentSong.name;

        this.createCharacter();
        this.createAllScoreNode();
    }

    update(dt: number) {
        this.updateSongProgress();
        this.updateNicknamePos();
    }

    /**
     * 更新音樂進度
     */
    private updateSongProgress() {
        this.progressBar_song.progress = AudioManager.getInstance().getSongTimeLeftProgress();
        this.label_songTimeLeft.string = AudioManager.getInstance().getSongTimeLeft();
    }

    /**
     * 更新暱稱位置
     */
    private updateNicknamePos() {
        this.nicknameMap.forEach((nicknameNode, character) => {
            const nicknameLabelPos = GameTool.getInstance().follow3DNode(
                this.camera3D,
                character.node,
                nicknameNode,
                Vec3.ZERO
            );

            // 更新 UI 位置
            if (nicknameLabelPos) { 
                const finalPos = v3();
                Vec3.add(finalPos, nicknameLabelPos, this.nicknamePosOffset);
                nicknameNode.setPosition(finalPos);
            }
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
            }
        });

    }

    /**
     * 創建所有玩家分數UI
     */
    private createAllScoreNode() {
        this.scoreNodePrefabNode.active = false;

        RoomData.players.forEach((player) => {
            let obj = instantiate(this.scoreNodePrefabNode);
            obj.active = true;
            obj.setParent(this.allScorePanel);

            let scoreNodePrefab = obj.getComponent(ScoreNodePrefab);
            if(scoreNodePrefab) {
                scoreNodePrefab.setData(player.nickname);

                this.scoreNodeMap.set(player.playerId, scoreNodePrefab);
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
            if(data.rating == 'MISS') hitCharacter.playAnimation('Idle', barIntervalMs);
            else hitCharacter.playAnimation(data.danceAnim, barIntervalMs);
        }

        // 轉為陣列並依分數「由高到低」排序 (b - a)
        const sortedPlayers = Object.keys(data.scores)
            .map(playerId => ({
                playerId: playerId,
                score: data.scores[playerId]
            }))
            .sort((a, b) => b.score - a.score);

        // 依照排序結果更新分數與 UI 層級順序
        sortedPlayers.forEach((item, index) => {
            const scoreNode = this.scoreNodeMap.get(item.playerId);
            if (scoreNode) {
                // 各玩家分數
                const startScore = scoreNode.currentScore || 0;
                const animObj = { value: startScore };

                tween(animObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            scoreNode.updateScore(GameTool.getInstance().formatNumber(animObj.value));
                        }
                    })
                    .start();

                // 記錄當前分數供下次動畫作為起始值
                scoreNode.currentScore = item.score;
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
    }
}



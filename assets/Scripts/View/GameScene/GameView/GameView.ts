import { _decorator, Component, instantiate, Label, Node, ProgressBar, tween } from 'cc';
import { BaseView } from '../../BaseView';
import { AudioManager } from '../../../Manager/AudioManager';
import { RoomData } from '../../../Data/RoomData';
import { ScoreNodePrefab } from './scoreNodePrefab';
import { IPlayHitResult } from '../../../Manager/GameManager';
import { PlayerData } from '../../../Data/PlayerData';
import { GameTool } from '../../../Tools/GameTool';
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

    private scoreNodeMap: Map<string, ScoreNodePrefab> = new Map();

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.label_selfScore.string = '0';
        this.label_songName.string = RoomData.currentSong.name;

        this.createAllScoreNode();
    }

    update(dt: number) {
        this.progressBar_song.progress = AudioManager.getInstance().getSongTimeLeftProgress();
        this.label_songTimeLeft.string = AudioManager.getInstance().getSongTimeLeft();
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
    public UpdateScore(data: IPlayHitResult) {
        if (!data || !data.scores) return;

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
                // 1. 各玩家分數 0.5 秒滾動動畫
                const startScore = scoreNode.currentScore || 0;
                const animObj = { value: startScore };

                tween(animObj)
                    .to(0.5, { value: item.score }, {
                        onUpdate: () => {
                            // 每一幀更新，並帶入千分位格式
                            scoreNode.updateScore(GameTool.getInstance().formatNumber(animObj.value));
                        }
                    })
                    .start();

                // 記錄當前分數供下次動畫作為起始值
                scoreNode.currentScore = item.score;
                scoreNode.node.setSiblingIndex(index);
            }

            // 2. 本地玩家個人總分 0.5 秒滾動動畫
            if (item.playerId === PlayerData.playerId && this.label_selfScore) {
                // 解析當前 Label 文字數字（消除既有的逗號）
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



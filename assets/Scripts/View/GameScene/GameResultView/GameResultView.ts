import { _decorator, Button, Component, instantiate, Label, Node, RichText } from 'cc';
import { BaseView } from '../../BaseView';
import { IGameResult } from '../../../Manager/GameManager';
import { GameResultItem } from './GameResultItem';
import { SceneLoader } from '../../../Manager/SceneLoader';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
import { DIFFICULTY_COLORS, RoomData } from '../../../Data/RoomData';
const { ccclass, property } = _decorator;

/**
 * 遊戲結果介面
 */
@ccclass('GameResultView')
export class GameResultView extends BaseView {
    @property(Node)
    private itemNode: Node = null;
    @property(Node)
    private itemPrefab: Node = null;
    @property(Button)
    private btn_confirm: Button = null;

    @property(RichText)
    private richText_difficulty: RichText = null;
    @property(Label)
    private label_bpm: Label = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;

    protected start(): void {
        this.btn_confirm.node.on(Button.EventType.CLICK, () => {
            SceneLoader.getInstance().loadScene('LobbyScene', true);
        }, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.itemPrefab.active = false;
    }

    public setData(data: IGameResult) {
        // 困難度
        const difficultyColor = DIFFICULTY_COLORS[RoomData.difficulty];
        this.richText_difficulty.string = `<color=#FFFFFF>困難度: </color><color=${difficultyColor}>${RoomData.difficultyName}</color>`;
        // BMP
        this.label_bpm.string = `BPM: ${RoomData.currentSong.bpm}`;
        // 歌曲名稱
        this.fixedMarqueeText.setTitle(RoomData.currentSong.name);

        // 排名由高到低排序
        const sortedPlayers = [...data.results].sort((a, b) => b.totalScore - a.totalScore);

        sortedPlayers.forEach((playerData, index) => {
            const obj = instantiate(this.itemPrefab);
            obj.active = true;
            obj.setParent(this.itemNode);

            const gameResultItem = obj.getComponent(GameResultItem);
            if(gameResultItem) {
                gameResultItem.setData(playerData, index);
            }
        });
    }
}



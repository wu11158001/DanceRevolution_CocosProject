import { _decorator, Component, Label, Node } from 'cc';
import { IPlayerGameResult } from '../../../Manager/GameManager';
import { GameTool } from '../../../Tools/GameTool';
const { ccclass, property } = _decorator;

/**
 * 遊戲結果項目
 */
@ccclass('GameResultItem')
export class GameResultItem extends Component {
    @property(Label)
    private label_nickname: Label = null;
        @property(Label)
    private label_score: Label = null;
        @property(Label)
    private label_combo: Label = null;
        @property(Label)
    private label_perfect: Label = null;
        @property(Label)
    private label_great: Label = null;
        @property(Label)
    private label_good: Label = null;
        @property(Label)
    private label_miss: Label = null;

    public setData(data: IPlayerGameResult) {
        this.label_nickname.string = data.nickname;
        this.label_score.string = GameTool.getInstance().formatNumber(data.totalScore);
        this.label_combo.string = GameTool.getInstance().formatNumber(data.maxPerfectCombo);
        this.label_perfect.string = GameTool.getInstance().formatNumber(data.ratings.PERFECT);
        this.label_great.string = GameTool.getInstance().formatNumber(data.ratings.GREAT);
        this.label_good.string = GameTool.getInstance().formatNumber(data.ratings.GOOD);
        this.label_miss.string = GameTool.getInstance().formatNumber(data.ratings.MISS);
    }
}



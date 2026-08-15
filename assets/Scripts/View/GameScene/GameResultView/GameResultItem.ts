import { _decorator, Color, Component, Label, Node, Sprite, tween, Vec3 } from 'cc';
import { IPlayerGameResult } from '../../../Manager/GameManager';
import { GameTool } from '../../../Tools/GameTool';
import { PlayerData } from '../../../Data/PlayerData';
const { ccclass, property } = _decorator;

/**
 * 遊戲結果項目
 */
@ccclass('GameResultItem')
export class GameResultItem extends Component {
    @property(Sprite)
    private mainBg: Sprite = null;
    @property(Color)
    private firstPlaceColor: Color = new Color(0,0,0,255);
    @property(Color)
    private otherColor: Color = new Color(0,0,0,255);

    @property(Node)
    private selfNode: Node = null;
    @property(Node)
    private firstPlaceNode: Node = null;

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

    // 本地指標移動參數
    private selfNodeMoveDistance = 20; // 上下移動距離
    private selfNodeDuration = 1.0;    // 單程時間

    public setData(data: IPlayerGameResult, index: number) {
        let isSelf = data.playerId == PlayerData.playerId;

        this.selfNode.active = isSelf;
        this.firstPlaceNode.active = index == 0;
        this.mainBg.color = isSelf ? this.firstPlaceColor : this.otherColor;

        this.label_nickname.string = data.nickname;
        this.label_score.string = GameTool.getInstance().formatNumber(data.totalScore);
        this.label_combo.string = GameTool.getInstance().formatNumber(data.maxPerfectCombo);
        this.label_perfect.string = GameTool.getInstance().formatNumber(data.ratings.PERFECT);
        this.label_great.string = GameTool.getInstance().formatNumber(data.ratings.GREAT);
        this.label_good.string = GameTool.getInstance().formatNumber(data.ratings.GOOD);
        this.label_miss.string = GameTool.getInstance().formatNumber(data.ratings.MISS);

        if(isSelf) {
            tween(this.selfNode)
                .by(this.selfNodeDuration, { position: new Vec3(0, this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .by(this.selfNodeDuration, { position: new Vec3(0, -this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .union()          // 將上面的動作打包為一個整體單元
                .repeatForever()  // 無限循環
                .start();
        }
    }
}



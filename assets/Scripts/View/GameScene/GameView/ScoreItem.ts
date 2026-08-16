import { _decorator, Color, Component, Label, Node, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 所有玩家分數項目
 */
@ccclass('ScoreItem')
export class ScoreItem extends Component {
    @property(Label)
    private label_nickname: Label = null;
    @property(Label)
    private label_score: Label = null;
    @property(Node)
    private crownNode: Node = null;
    @property(Node)
    private selfNode: Node = null;
    @property(Color)
    private localScoreColor: Color = null;
    @property(Color)
    private otherScoreColor: Color = null;

    public currentScore: number = 0;

    // 本地指標移動參數
    private selfNodeMoveDistance = 10; // 上下移動距離
    private selfNodeDuration = 1.0;    // 單程時間

    protected start(): void {
        tween(this.selfNode)
            .by(this.selfNodeDuration, { position: new Vec3(0, this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
            .by(this.selfNodeDuration, { position: new Vec3(0, -this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
            .union()          // 將上面的動作打包為一個整體單元
            .repeatForever()  // 無限循環
            .start();
    }

    /**
     * 設置初始資料
     * @param nuckname 
     */
    public setData(nuckname: string) {
        this.label_nickname.string = nuckname;
        this.label_score.string = `${0}`;

        this.crownNode.active = false;
        this.selfNode.active = false;
    }

    /**
     * 更新分數
     * @param score        
     */
    public updateScore(score: string, ) {
        this.label_score.string = score;

    }

    /**
     * 更新Icon顯示
     * @param isFirstPlace  // 是否第一名
     * @param isSelf        // 是否本地玩家
     */
    public updateIcon(isFirstPlace: boolean, isSelf: boolean) {
        this.crownNode.active = isFirstPlace;
        this.selfNode.active = isSelf;

        this.label_score.color = isSelf ? this.localScoreColor : this.otherScoreColor;
    }
}



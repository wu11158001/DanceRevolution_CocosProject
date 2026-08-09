import { _decorator, Color, Component, Label, Node } from 'cc';
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
    private localScoreColor: Color = Color.WHITE;
    @property(Color)
    private otherScoreColor: Color = Color.WHITE;

    public currentScore: number = 0;

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



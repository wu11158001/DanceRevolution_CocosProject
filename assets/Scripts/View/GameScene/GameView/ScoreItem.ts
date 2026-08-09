import { _decorator, Component, Label, Node } from 'cc';
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

    public currentScore: number = 0;

    /**
     * 設置初始資料
     * @param nuckname 
     */
    public setData(nuckname: string) {
        this.label_nickname.string = nuckname;
        this.label_score.string = `${0}`;
    }

    /**
     * 更新分數
     * @param score 
     */
    public updateScore(score: string) {
        this.label_score.string = score;
    }
}



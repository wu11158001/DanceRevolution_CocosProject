import { _decorator, Component, Node, Label, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 獨立移動 Label 的跑馬燈
 */
@ccclass('FixedMarqueeText')
export class FixedMarqueeText extends Component {
    @property(Label)
    public label_1: Label = null!;

    @property(Label)
    public label_2: Label = null!;

    @property(UITransform)
    public maskTransform: UITransform = null!;

    @property({tooltip: "移動速度 (像素/秒)"})
    public speed: number = 40;

    @property({tooltip: "兩段文字之間的間隔距離"})
    public spacing: number = 70;

    private _textWidth: number = 0;
    private _isScrolling: boolean = false;

    /**
     * 設定文字與初始化跑馬燈
     */
    public setTitle(title: string) {
        this.label_1.string = title;
        this.label_2.string = title;

        // 強制更新 Label 尺寸以取得正確寬度
        this.label_1.updateRenderData(true);
        this._textWidth = this.label_1.getComponent(UITransform)!.width;

        const maskWidth = this.maskTransform.width;

        // 父物件保持在 (0,0) 原點
        this.node.setPosition(0, 0, 0);

        if (this._textWidth > maskWidth) {
            this._isScrolling = true;

            // 初始化兩個 Label 的相對位置
            this.label_1.node.setPosition(0, 0, 0);
            this.label_2.node.setPosition(this._textWidth + this.spacing, 0, 0);
            this.label_2.node.active = true;
        } else {
            // 文字短於遮罩，靜止顯示
            this._isScrolling = false;
            this.label_1.node.setPosition(0, 0, 0);
            this.label_2.node.active = false;
        }
    }

    update(dt: number) {
        if (!this._isScrolling) return;

        const moveDistance = this.speed * dt;

        // 1. 分別讓兩個 Label 向左移動
        this.moveLabelLeft(this.label_1.node, moveDistance);
        this.moveLabelLeft(this.label_2.node, moveDistance);

        // 2. 檢查是否有 Label 已經完全移出左側遮罩範圍
        // 當 X 座標 <= -(單個文字寬度 + 間隔) 時，代表完全看不到它了
        const resetBoundary = -(this._textWidth + this.spacing);

        if (this.label_1.node.position.x <= resetBoundary) {
            // 把 label_1 接到 label_2 的右邊
            const newX = this.label_2.node.position.x + this._textWidth + this.spacing;
            this.label_1.node.setPosition(newX, 0, 0);
        }

        if (this.label_2.node.position.x <= resetBoundary) {
            // 把 label_2 接到 label_1 的右邊
            const newX = this.label_1.node.position.x + this._textWidth + this.spacing;
            this.label_2.node.setPosition(newX, 0, 0);
        }
    }

    /**
     * 文字移動
     * @param node 
     * @param distance 
     */
    private moveLabelLeft(node: Node, distance: number) {
        const pos = node.position;
        node.setPosition(pos.x - distance, pos.y, pos.z);
    }
}
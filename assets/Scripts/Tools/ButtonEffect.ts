import { _decorator, Component, Node, Vec3, Color, Sprite, Tween, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 按鈕效果
 */
@ccclass('ButtonEffect')
export class ButtonEffect extends Component {
    @property(Node)
    private targetNode: Node = null!;

    // 縮放設定
    private normalScale = new Vec3(1, 1, 1);
    private pressedScale = new Vec3(0.9, 0.9, 1);

    // 顏色設定
    private normalColor = new Color(255, 255, 255, 255);
    private pressedColor = new Color(200, 200, 200, 255);

    private sprite: Sprite | null = null;

    onLoad() {
        if (!this.targetNode) this.targetNode = this.node;
        this.sprite = this.targetNode.getComponent(Sprite);

        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onRelease, this);
    }

    private onPress() {
        // 同時播放縮放與變色
        Tween.stopAllByTarget(this.targetNode);
        
        tween(this.targetNode)
            .to(0.05, { scale: this.pressedScale })
            .start();

        if (this.sprite) {
            this.sprite.color = this.pressedColor;
        }
    }

    private onRelease() {
        Tween.stopAllByTarget(this.targetNode);

        tween(this.targetNode)
            .to(0.05, { scale: this.normalScale })
            .start();

        if (this.sprite) {
            this.sprite.color = this.normalColor;
        }
    }
}



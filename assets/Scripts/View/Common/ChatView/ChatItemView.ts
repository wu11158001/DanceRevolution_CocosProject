import { _decorator, Component, Label, Node, UITransform, v3, Vec2, Vec3, HorizontalTextAlignment, Sprite } from 'cc';
import { SpriteFrameManager } from '../../../Manager/SpriteFrameManager';
const { ccclass, property } = _decorator;

/**
 * 聊天內容項目
 */
@ccclass('ChatItemView')
export class ChatItemView extends Component {
    @property(UITransform)
    private mainTransform: UITransform = null;

    @property(Label)
    private label_nickname: Label = null;
    @property(UITransform)
    private nicknameTransform: UITransform = null;

    @property(UITransform)
    private messageNodeTransform: UITransform = null;
    @property(Label)
    private label_message: Label = null;
    @property(UITransform)
    private labelTransform: UITransform = null;

    @property(UITransform)
    private stickTransform: UITransform = null;
    @property(Sprite)
    private sprite_stick: Sprite = null;

    @property({ tooltip: "文字訊息最大寬度" })
    maxWidth: number = 530;
    @property({ tooltip: "背景Padding" })
    bgPadding: number = 10;

    private isSelf: boolean = false;

    protected start(): void {
        this.isSelf = false;
        this.setDirection();
        
        //this.showMessage('問自訊息問自訊息問自');
        this.showStick(0);
    }

    /**
     * 設置顯示方向
     */
    private setDirection() {
        const anchorPoint = this.isSelf ? new Vec2(1, 0.5) : new Vec2(0, 0.5);
        this.mainTransform.anchorPoint = anchorPoint;
        this.nicknameTransform.anchorPoint = anchorPoint;
        this.messageNodeTransform.anchorPoint = anchorPoint;
        this.labelTransform.anchorPoint = anchorPoint;
        this.stickTransform.anchorPoint = anchorPoint;

        const horizontalAlign = this.isSelf ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.LEFT;
        this.label_nickname.horizontalAlign = horizontalAlign;
        this.label_message.horizontalAlign = horizontalAlign;

        this.label_nickname.node.position = new Vec3(0, this.label_nickname.node.position.y, 0);
    }

    /**
     * 顯示貼圖
     */
    private showStick(index: number) {
        this.messageNodeTransform.node.active = false;
        this.stickTransform.node.active = true;

        const spriteFrame = SpriteFrameManager.getInstance().getStick(index);
        if(spriteFrame) {
            this.sprite_stick.spriteFrame = spriteFrame;
        }
    }

    /**
     * 顯示文字訊息
     */
    private showMessage(message: string) {
        this.messageNodeTransform.node.active = true;
        this.stickTransform.node.active = false;

        // 設為 NONE，計算單行自然寬度
        this.label_message.overflow = Label.Overflow.NONE;
        this.label_message.string = message;
        this.label_message.updateRenderData(true);
        
        // 判斷是否超過最大寬度限制
        if (this.labelTransform.width > this.maxWidth) {
            this.labelTransform.width = this.maxWidth;
            this.label_message.overflow = Label.Overflow.RESIZE_HEIGHT;
            
            // 強制更新，取得換行後的正確高度
            this.label_message.updateRenderData(true);
        }
        
        const offsetX = this.isSelf ? -this.bgPadding : this.bgPadding;
        this.label_message.node.position = new Vec3(offsetX, 0, 0);

        // 設置背景大小+Padding
        const pad = this.bgPadding * 2;
        this.messageNodeTransform.setContentSize(
            this.labelTransform.width + pad,
            this.labelTransform.height + pad
        )
    }
}



import { _decorator, Button, Component, Node, Enum, Vec3, Color, Sprite, Tween, tween, Label} from 'cc';

import { AudioManager, SFX_TYPE } from 'db://assets/Scripts/Manager/AudioManager';

const { ccclass, property } = _decorator;

/**
 * 按鈕點擊擴充
 */
@ccclass('BtnClick')
export class BtnClick extends Component {
    @property({ type: Enum(SFX_TYPE) })
    private sfxType: SFX_TYPE = SFX_TYPE.ButtonClick;
    @property({type: Node, tooltip: "縮放的 Node，若為空則使用按鈕自身的 Node"})
    private scaleNode: Node = null!;
    @property({type: Node, tooltip: "顏色變化的 Node，若為空則使用按鈕自身的 Node"})
    private colorNode: Node = null!;

    private button: Button = null;

    // 縮放設定
    private normalScale = new Vec3(1, 1, 1);
    private pressedScale = new Vec3(0.9, 0.9, 1);

    // 顏色設定
    private normalColor = new Color(255, 255, 255, 255);
    private pressedColor = new Color(200, 200, 200, 255);
    private disabledColor = new Color(100, 100, 100, 255);

    private targetRenderable: Sprite | Label | null = null;

    private isPlayingSound: boolean = true;

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.off(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onCancel, this);
    }

    onLoad() {
        this.button = this.getComponent(Button);

        if (!this.scaleNode) this.scaleNode = this.node;
        if(!this.colorNode) this.colorNode = this.node;

        this.targetRenderable = this.colorNode.getComponent(Sprite) || this.colorNode.getComponent(Label);
        this.normalScale.set(this.scaleNode.scale);

        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onCancel, this);

        // 綁定 interactable 的 setter 攔截
        this.hookInteractable();

    }

    /** 
     * 攔截 Button 的 interactable 屬性
     *  */
    private hookInteractable() {
        if (!this.button) return;

        let val = this.button.interactable;
        
        // 先執行一次初始化的 UI 狀態更新
        this.updateStateUI(val);

        Object.defineProperty(this.button, 'interactable', {
            get: () => val,
            set: (newVal: boolean) => {
                if (val !== newVal) {
                    val = newVal;
                    this.updateStateUI(newVal); // 當屬性改變時觸發 UI 更新
                }
            },
            configurable: true,
            enumerable: true
        });
    }

    /** 
     * 根據禁用/啟用狀態更新 UI 
     * */
    private updateStateUI(interactable: boolean) {
        if (this.targetRenderable) {
            this.targetRenderable.color = interactable ? this.normalColor : this.disabledColor;
        }

        // 禁用時自動恢復原始縮放
        if (!interactable && this.scaleNode) {
            Tween.stopAllByTarget(this.scaleNode);
            this.scaleNode.setScale(this.normalScale);
        }
    }

    private playSound() {
        if(this.button && !this.button.interactable) return;

        if(this.sfxType !== null) {
            AudioManager.getInstance().playSFX(this.sfxType);
        }
    }

    private onPress() {
        if(this.button && !this.button.interactable) return;

        this.isPlayingSound = true;

        Tween.stopAllByTarget(this.scaleNode);

        // 放縮
        tween(this.scaleNode)
            .to(0.05, { scale: this.pressedScale })
            .start();

        // 變色
        if (this.targetRenderable) {
            this.targetRenderable.color = this.pressedColor;
        }
    }

    private onRelease() {
        if(this.button && !this.button.interactable) return;

        if(this.isPlayingSound) {
            this.playSound();
        }

        Tween.stopAllByTarget(this.scaleNode);

        tween(this.scaleNode)
            .to(0.05, { scale: this.normalScale })
            .start();

        if (this.targetRenderable) {
            this.targetRenderable.color = this.normalColor;
        }
    }

    private onCancel() {
        if(this.button && !this.button.interactable) return;

        this.isPlayingSound = false;
        this.onRelease();
    }
}



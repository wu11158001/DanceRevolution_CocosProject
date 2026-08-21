import { _decorator, Button, Component, Node, Enum, Vec3, Color, Sprite, Tween, tween, Label} from 'cc';

import { AudioManager, SFX_TYPE } from 'db://assets/Scripts/Manager/AudioManager';

const { ccclass, property } = _decorator;

/**
 * 自訂按鈕
 */
@ccclass('CustomButton')
export class CustomButton extends Button {
    @property({ type: Enum(SFX_TYPE) })
    private sfxType: SFX_TYPE = SFX_TYPE.ButtonClick;
    @property({type: Node, tooltip: "縮放的 Node，若為空則使用按鈕自身的 Node"})
    private scaleNode: Node = null!;
    @property({tooltip: "是否使用縮放效果"})
    private isUseScale: boolean = true;
    @property({tooltip: "縮放設定"})
    private pressedScale = new Vec3(0.9, 0.9, 1);
    
    // 按鈕正常大小
    private normalScale = new Vec3(1, 1, 1);
    // 是否播放音效,移出按鈕時不播放音效
    private isPlayingSound: boolean = true;

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.off(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onCancel, this);
    }

    onLoad() {
        if (!this.scaleNode) this.scaleNode = this.node;
        this.normalScale.set(this.scaleNode.scale);

        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onCancel, this);

    }

    private playSound() {
        if(!this.interactable) return;

        if(this.sfxType !== null && this.sfxType !== SFX_TYPE.None){
            AudioManager.getInstance().playSFX(this.sfxType);
        }
    }

    private onPress() {
        if(!this.interactable) return;

        this.isPlayingSound = true;

        // 放縮
        if(this.isUseScale) {
            Tween.stopAllByTarget(this.scaleNode);

            tween(this.scaleNode)
                .to(0.05, { scale: this.pressedScale })
                .start();
        }        
    }

    private onRelease() {
        if(!this.interactable) return;

        if(this.isPlayingSound) {
            this.playSound();
        }

        if(this.isUseScale) {
            Tween.stopAllByTarget(this.scaleNode);

            tween(this.scaleNode)
                .to(0.05, { scale: this.normalScale })
                .start();
        }
    }

    private onCancel() {
        if(!this.interactable) return;

        this.isPlayingSound = false;
        this.onRelease();
    }
}
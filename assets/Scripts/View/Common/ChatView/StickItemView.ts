import { _decorator, Button, Component, Node, Sprite } from 'cc';
import { SpriteFrameManager } from '../../../Manager/SpriteFrameManager';
const { ccclass, property } = _decorator;

/**
 * 貼圖項目
 */
@ccclass('StickItemView')
export class StickItemView extends Component {
    @property(Button)
    private mainBtn: Button = null;
    @property(Sprite)
    private mainSprite: Sprite = null;

    public setData(stickName: string, callback?: (stickName: string) => void) {
        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => {callback?.(stickName)}, this);

        this.mainSprite.spriteFrame = SpriteFrameManager.getInstance().getStick(stickName);
    }
}



import { _decorator, Component, Node, Button } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 介面遮罩
 */
@ccclass('BackgroundMaskView')
export class BackgroundMaskView extends Component {
    @property(Button)
    private btn_mask: Button = null;

    private clickCallback: (() => void) | null = null;

    /**
     * 設定遮罩點擊事件與狀態
     * @param isCanClickMask 是否可點擊
     * @param callback 點擊觸發的回呼函式
     */
    public setClickAction(isCanClickMask: boolean, callback?: () => void) {
        if (this.btn_mask) {
            this.btn_mask.interactable = isCanClickMask;

            if (isCanClickMask && callback) {
                this.clickCallback = callback;
                this.btn_mask.node.on(Button.EventType.CLICK, this.clickCallback, this);
            }
        }
    }
}



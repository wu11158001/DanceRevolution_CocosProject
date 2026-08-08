import { _decorator, Component, Node, Vec3, tween, Tween, UIOpacity, instantiate, Prefab, resources, Enum } from 'cc';

import { ViewManager, ViewType } from 'db://assets/Scripts/Manager/ViewManager';
import { GameTool } from 'db://assets/Scripts/Tools/GameTool';
import { BackgroundMaskView } from 'db://assets/Scripts/View/Common/BackgroundMaskView';

const { ccclass, property } = _decorator;

/**
 * 彈出效果類型
 */
export enum POPUP_TYPE {
    DownToUp = 'DownToUp',
    Scaling = 'Scaling'
}
Enum(POPUP_TYPE);

@ccclass('BaseView')
export class BaseView extends Component {
    public viewType: ViewType = null;

    @property({ tooltip: '是否開啟遮罩' })
    private isUsingMask: boolean = false;

    @property({ 
        tooltip: '遮罩是否可以點擊',
        visible(this: BaseView) { return this.isUsingMask; } 
    })
    private isCanClickMask: boolean = true;

    @property({ tooltip: '是否使用彈出效果' })
    private isPopupEffect: boolean = false;

    @property({ 
        type: Node, 
        tooltip: '彈出效果物件',
        visible(this: BaseView) { return this.isPopupEffect; } 
    })
    private popupObj: Node = null!;

    @property({ 
        type: POPUP_TYPE, 
        tooltip: '彈出效果類型',
        visible(this: BaseView) { return this.isPopupEffect; } 
    })
    private popupType: POPUP_TYPE = POPUP_TYPE.DownToUp;


    protected uiOpacity: UIOpacity | null = null;
    private isClosed: boolean = false;
   
    /**
     * 關閉時觸發
     */
    public onClose() {
        if (this.isClosed) return;
        this.isClosed = true;

        if (this.popupObj) {
            Tween.stopAllByTarget(this.popupObj);
        }

        this.node.destroy();
    }

    /**
     * 主動關閉自己
     */
    public closeSelf() {
        ViewManager.getInstance().closeView(this.viewType);
    }

    protected onLoad() {
        this.uiOpacity = this.getComponent(UIOpacity);
        if (!this.uiOpacity) {
            this.uiOpacity = this.addComponent(UIOpacity);
        }
        this.uiOpacity.opacity = 0;
    }

    /**
     * 開啟時觸發
     */
    public async onOpen(params?: any) {
        await this.setBackgroundMask();

        // 執行彈出效果
        if (this.isPopupEffect && this.popupObj) {
            switch (this.popupType) {
                case POPUP_TYPE.DownToUp:
                    this.doDownToUpPopupEffect();
                    break;
                case POPUP_TYPE.Scaling:
                    this.doScalingPopupEffect();
                    break;
            }
        }
    }

    /**
     * 設置背景遮罩
     * @returns 
     */
    private async setBackgroundMask(): Promise<void> {
        if (!this.isUsingMask) {
            if (this.uiOpacity) this.uiOpacity.opacity = 255;
            return;
        }

        if (this.uiOpacity) this.uiOpacity.opacity = 0;

        try {
            const prefab = await GameTool.getInstance().loadPrefab('View/BackgroundMaskView');
            if (!prefab) {
                console.error('背景遮罩產生錯誤!');
                return;
            }

            const maskNode = instantiate(prefab);
            maskNode.setParent(this.node);
            
            maskNode.setSiblingIndex(0);

            // 設置Layer
            maskNode.walk((node) => {
                node.layer = this.node.layer;
            });

            const maskView = maskNode.getComponent(BackgroundMaskView);
            maskView?.setClickAction(this.isCanClickMask, () => this.onClickMask());

        } catch (error) {
            console.error('載入遮罩失敗:', error);
        } finally {
            if (this.uiOpacity) this.uiOpacity.opacity = 255;
        }
    }

    /**
     * 點擊遮罩按鈕
     */
    public onClickMask() {
        this.closeSelf();
    }

    /**
     * 執行由下至上彈出效果
     */
    protected doDownToUpPopupEffect() {
        Tween.stopAllByTarget(this.popupObj);
        this.popupObj.setPosition(0, -911, 0);
        tween(this.popupObj)
            .to(0.5, { position: new Vec3(0, 0, 0) }, { easing: 'backOut' })
            .call(() => this.onEffectComplete())
            .start();
    }

    /**
     * 執行小至大縮放彈出效果
     */
    protected doScalingPopupEffect() {
        Tween.stopAllByTarget(this.popupObj);
        this.popupObj.setScale(Vec3.ZERO);
        tween(this.popupObj)
            .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => this.onEffectComplete())
            .start();
    }

    /**
     * 移動效果完成
     */
    protected onEffectComplete() {

    }
}
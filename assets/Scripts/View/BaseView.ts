import { _decorator, Component, Node, Vec3, tween, Tween, UIOpacity, instantiate, Prefab, resources, Enum } from 'cc';

import { ViewManager, ViewType } from 'db://assets/Scripts/Manager/ViewManager';
import { GameTool } from 'db://assets/Scripts/Tools/GameTool';
import { BackgroundMaskView } from 'db://assets/Scripts/View/Common/BackgroundMaskView';

const { ccclass, property } = _decorator;

/**
 * 彈出效果類型枚舉
 */
export enum POPUP_TYPE {
    DownToUp = 'DownToUp',  // 由下至上滑入效果
    Scaling = 'Scaling'     // 縮放彈出效果
}
Enum(POPUP_TYPE);

/**
 * 視圖基礎類別
 */
@ccclass('BaseView')
export class BaseView extends Component {    
    public viewType: ViewType = null;

    /**
     * 是否使用背景遮罩
     */
    @property({ tooltip: '是否開啟遮罩' })
    private isUsingMask: boolean = false;

    /**
     * 遮罩是否可點擊關閉
     */
    @property({ 
        tooltip: '遮罩是否可以點擊',
        visible(this: BaseView) { return this.isUsingMask; } 
    })
    private isCanClickMask: boolean = true;

    /**
     * 是否使用彈出效果
     */
    @property({ tooltip: '是否使用彈出效果' })
    private isPopupEffect: boolean = false;

    /**
     * 彈出效果的目標節點
     */
    @property({ 
        type: Node, 
        tooltip: '彈出效果物件',
        visible(this: BaseView) { return this.isPopupEffect; } 
    })
    private popupObj: Node = null!;

    /**
     * 彈出效果類型
     */
    @property({ 
        type: POPUP_TYPE, 
        tooltip: '彈出效果類型',
        visible(this: BaseView) { return this.isPopupEffect; } 
    })
    private popupType: POPUP_TYPE = POPUP_TYPE.DownToUp;

    protected uiOpacity: UIOpacity | null = null;
    
    /**
     * 避免多次觸發 destroy()
     */
    private isClosed: boolean = false;

    /**
     * 組件載入時的回調
     */
    protected onLoad(): void {
        this.uiOpacity = this.getComponent(UIOpacity);
        if (!this.uiOpacity) {
            this.uiOpacity = this.addComponent(UIOpacity);
        }
        
        this.uiOpacity.opacity = 0;
    }

    /**
     * 視圖開啟時的回調
     * @param params 開啟視圖時傳入的參數（可選）
     */
    public async onOpen(params?: any): Promise<void> {
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
     * 視圖關閉時的回調
     */
    public onClose(): void {
        // 防止重複關閉
        if (this.isClosed) return;
        this.isClosed = true;

        // 停止彈出物件的所有動畫
        if (this.popupObj) {
            Tween.stopAllByTarget(this.popupObj);
        }

        // 銷毀節點
        this.node.destroy();
    }

    /**
     * 主動關閉視圖
     */
    public closeSelf(): void {
        ViewManager.getInstance().closeView(this.viewType);
    }

    /**
     * 設置背景遮罩
     */
    private async setBackgroundMask(): Promise<void> {
        // 不使用遮罩時，直接顯示視圖
        if (!this.isUsingMask) {
            if (this.uiOpacity) this.uiOpacity.opacity = 255;
            return;
        }

        // 暫時設為透明，等待遮罩載入
        if (this.uiOpacity) this.uiOpacity.opacity = 0;

        try {
            // 載入遮罩 Prefab
            const prefab = await GameTool.getInstance().loadPrefab('View/BackgroundMaskView');
            if (!prefab) {
                console.error('[BaseView] 背景遮罩 Prefab 載入失敗!');
                return;
            }
            const maskNode = instantiate(prefab);
            maskNode.setParent(this.node);
            maskNode.setSiblingIndex(0);
            maskNode.walk((node) => {
                node.layer = this.node.layer;
            });

            // 設置遮罩的點擊行為
            const maskView = maskNode.getComponent(BackgroundMaskView);
            maskView?.setClickAction(this.isCanClickMask, () => this.onClickMask());

        } catch (error) {
            console.error('[BaseView] 載入遮罩時發生錯誤:', error);
        } finally {
            // 無論成功或失敗，都恢復不透明度
            if (this.uiOpacity) this.uiOpacity.opacity = 255;
        }
    }

    /**
     * 點擊遮罩時的回調
     */
    public onClickMask(): void {
        this.closeSelf();
    }

    /**
     * 執行由下至上滑入效果
     */
    protected doDownToUpPopupEffect(): void {
        // 停止目標節點上的所有 Tween
        Tween.stopAllByTarget(this.popupObj);
        
        // 設定初始位置（畫面下方）
        this.popupObj.setPosition(0, -911, 0);
        
        // 執行滑入動畫
        tween(this.popupObj)
            .to(0.5, { position: new Vec3(0, 0, 0) }, { easing: 'backOut' })
            .call(() => this.onEffectComplete())
            .start();
    }

    /**
     * 執行從小到大縮放彈出效果
     */
    protected doScalingPopupEffect(): void {
        // 停止目標節點上的所有 Tween
        Tween.stopAllByTarget(this.popupObj);
        
        // 設定初始縮放
        this.popupObj.setScale(Vec3.ZERO);
        
        // 執行縮放動畫
        tween(this.popupObj)
            .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => this.onEffectComplete())
            .start();
    }

    /**
     * 彈出效果完成時的回調
     */
    protected onEffectComplete(): void {
        
    }
}
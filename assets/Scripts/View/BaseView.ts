import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BaseView')
export class BaseView extends Component {
    // UI 識別名稱 (例如 "LobbyView")
    //public viewName: string = '';

    /**
     * 當 UI 被開啟時觸發 (可由 UIManager 傳入初始化參數)
     */
    public onOpen(params?: any) {
        // 由子類別 (如 LobbyView) 重寫邏輯
    }

    /**
     * 當 UI 被關閉時觸發
     */
    public onClose() {
        // 由子類別重寫邏輯
    }

    /**
     * 主動關閉自己
     */
    public closeSelf() {
        // 由 UIManager 統一處理銷毀
        //ViewManager.getInstance().closeView(this.viewName);
    }
}
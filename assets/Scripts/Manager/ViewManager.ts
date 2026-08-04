import { _decorator, Node, instantiate, resources, Prefab, find, Canvas } from 'cc';
import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { BaseView } from 'db://assets/Scripts/View/BaseView';

const { ccclass, property } = _decorator;

/**
 * Cancas類型
 */
export type CanvasType = 
'HUD' |
'Highest';

/**
 * 介面類型
 */
export type ViewType = 
'BackgroundMaskView' |
'MessagePopupView' |
'LobbyView' |
'UpdateNicknameView' |
'RoomView' |
'UpdateRoomNameView';

/**
 * 介面管理中心
 */
@ccclass('ViewManager')
export class ViewManager extends SingletonComponent<ViewManager> {
    @property(Node)
    private canvas_HUD: Node;
    @property(Node)
    private canvas_Highest: Node;

    // 預設預載 Prefab 的資料夾路徑
    private uiPrefabPath: string = 'View/';

    // 保存當前已開啟的介面實例 (ViewName -> BaseView)
    private openViews: Map<ViewType, BaseView> = new Map();

    /**
     * 開啟介面
     * @param viewType
     * @param params 傳遞給 UI 的初始化資料
     * @returns Promise<T> 回傳泛型組件
     */
    public async openView<T extends BaseView>(viewType: ViewType, canvasType: CanvasType, params?: any): Promise<T | null> {
        // 檢查是否已經開啟過
        if (this.openViews.has(viewType)) {
            const existingView = this.openViews.get(viewType) as T;
            existingView.node.active = true;
            existingView.onOpen(params);
            return existingView;
        }

        // 從 resources 動態載入 Prefab
        const prefabPath = `${this.uiPrefabPath}${viewType}`;
        
        return new Promise<T | null>((resolve) => {
            resources.load(prefabPath, Prefab, (err, prefab) => {
                if (err) {
                    console.error(`[ViewManager] 載入介面失敗: ${prefabPath}`, err);
                    resolve(null);
                    return;
                }

                let canvasNode: Node | null = null
                switch(canvasType) {
                    case 'HUD':
                        canvasNode = this.canvas_HUD;
                        break;
                    case 'Highest':
                        canvasNode = this.canvas_Highest;
                        break;

                }

                // 實例化 Prefab 並掛載到 Canvas
                const uiNode = instantiate(prefab);
                const parentNode = canvasNode;
                uiNode.parent = parentNode;

                // 獲取 View 組件
                const viewComponent = uiNode.getComponent(viewType) as T;
                if (!viewComponent) {
                    console.error(`[UIManager] Prefab '${viewType}' 根節點上找不到對應組件！`);
                    uiNode.destroy();
                    resolve(null);
                    return;
                }

                // 初始化 View
                viewComponent.viewType = viewType;
                viewComponent.onOpen(params);

                this.openViews.set(viewType, viewComponent);

                resolve(viewComponent);
            });
        });
    }

    /**
     * 獲取目前已經開啟的介面
     */
    public getView<T extends BaseView>(viewType: ViewType): T | null {
        if (this.openViews.has(viewType)) {
            return this.openViews.get(viewType) as T;
        }
        return null;
    }

    /**
     * 關閉並銷毀指定的介面
     */
    public closeView(viewType: ViewType) {
        if (this.openViews.has(viewType)) {
            const view = this.openViews.get(viewType)!;
            view.onClose();
            view.node.destroy();
            this.openViews.delete(viewType);
            console.log(`[UIManager] 已關閉 UI: ${viewType}`);
        }
    }

    /**
     * 關閉所有已開啟的介面
     */
    public closeAllViews() {
        this.openViews.forEach((view, viewType) => {
            view.onClose();
            view.node.destroy();
        });
        this.openViews.clear();
    }
}
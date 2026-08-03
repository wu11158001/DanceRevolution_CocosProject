import { _decorator, Node, instantiate, resources, Prefab, find, Canvas } from 'cc';
import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { BaseView } from 'db://assets/Scripts/View/BaseView';

const { ccclass, property } = _decorator;

export type ViewType = 'LobbyView';

/**
 * 介面管理中心
 */
@ccclass('ViewManager')
export class ViewManager extends SingletonComponent<ViewManager> {
    // 預設預載 Prefab 的資料夾路徑
    private uiPrefabPath: string = 'View/';

    // 保存當前已開啟的 UI 實例 (ViewName -> BaseView)
    private openViews: Map<ViewType, BaseView> = new Map();

    // 畫布根節點 (UI 會被放到這個 Node 下)
    private uiCanvasNode: Node | null = null;

    /**
     * 獲取畫布根節點 (如果找不到會自動搜尋當前 Scene 的 Canvas)
     */
    private getCanvasNode(): Node {
        if (!this.uiCanvasNode || !this.uiCanvasNode.isValid) {
            // 自動尋找場景中的 Canvas 節點
            const canvas = find('Canvas');
            if (canvas) {
                this.uiCanvasNode = canvas;
            } else {
                console.error('[UIManager] 場景中找不到 Canvas 節點！');
            }
        }
        return this.uiCanvasNode!;
    }

    /**
     * 開啟 / 創建 UI 介面，並獲取其 Component (核心 API)
     * @param viewName Prefab 名稱與 Component 名稱 (例如 "LobbyView")
     * @param params 傳遞給 UI 的初始化資料 (選填)
     * @returns Promise<T> 回傳泛型組件
     */
    public async openView<T extends BaseView>(viewType: ViewType, params?: any): Promise<T | null> {
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
                    console.error(`[UIManager] 載入 UI Prefab 失敗: ${prefabPath}`, err);
                    resolve(null);
                    return;
                }

                // 實例化 Prefab 並掛載到 Canvas
                const uiNode = instantiate(prefab);
                const parentNode = this.getCanvasNode();
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
                this.openViews.set(viewType, viewComponent);
                viewComponent.onOpen(params);

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
import { _decorator, Node, instantiate, resources, Prefab, Layers } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { BaseView } from 'db://assets/Scripts/View/BaseView';

const { ccclass, property } = _decorator;

/**
 * Canvas 類型
 */
export type CanvasType = 
'Canvas_Background' |
'HUD' |
'Popup' |
'Highest';

/**
 * 介面類型
 */
export enum ViewType {
    BackgroundMaskView = 'BackgroundMaskView',
    MessagePopupView = 'MessagePopupView',
    LobbyView = 'LobbyView',
    UpdateNicknameView = 'UpdateNicknameView',
    RoomView = 'RoomView',
    UpdateRoomNameView = 'UpdateRoomNameView',
    SelectSongView = 'SelectSongView',
    HitNodeView = 'HitNodeView',
    GameView = 'GameView',
    BeatResultView = 'BeatResultView',
    GameResultView = 'GameResultView',
    GameTextTipView = 'GameTextTipView',
    ChatView = 'ChatView',
    DifficultyIllustrateView = 'DifficultyIllustrateView',
    RoomListView = 'RoomListView'
}

/**
 * 介面管理中心
 */
@ccclass('ViewManager')
export class ViewManager extends SingletonComponent<ViewManager> {
    @property(Node)
    private canvas_Background: Node = null!;
    @property(Node)
    private canvas_HUD: Node = null!;
    @property(Node)
    private canvas_Popup: Node = null!;
    @property(Node)
    private canvas_Highest: Node = null!;

    // 預設預載 Prefab 的資料夾路徑
    private uiPrefabPath: string = 'View/';

    // 保存當前已開啟的介面實例 (ViewType -> BaseView)
    private openViews: Map<ViewType, BaseView> = new Map();

    // 保存已載入的 Prefab 快取 (ViewType -> Prefab)
    private prefabCache: Map<ViewType, Prefab> = new Map();

    // 紀錄正在載入中的 Promise，避免重複觸發載入 (ViewType -> Promise)
    private loadingPromises: Map<ViewType, Promise<Prefab | null>> = new Map();

    public get BackgroundCanvas(): Node {
        return this.canvas_Background;
    }

    /**
     * 載入並快取 Prefab
     * @param viewType 
     */
    public async loadPrefab(viewType: ViewType): Promise<Prefab | null> {
        // 如果已經有快取，直接返回
        if (this.prefabCache.has(viewType)) {
            return this.prefabCache.get(viewType)!;
        }

        // 如果正在載入中，直接返回該載入過程的 Promise (防止連點導致重複讀取檔案)
        if (this.loadingPromises.has(viewType)) {
            return this.loadingPromises.get(viewType)!;
        }

        // 第一次載入，建立 Promise 並紀錄
        const prefabPath = `${this.uiPrefabPath}${viewType}`;
        const loadPromise = new Promise<Prefab | null>((resolve) => {
            resources.load(prefabPath, Prefab, (err, prefab) => {
                // 載入完成，移除「載入中」標記
                this.loadingPromises.delete(viewType);

                if (err || !prefab) {
                    console.error(`[ViewManager] 載入介面 Prefab 失敗: ${prefabPath}`, err);
                    resolve(null);
                    return;
                }

                // 存入 Prefab 快取
                this.prefabCache.set(viewType, prefab);
                resolve(prefab);
            });
        });

        this.loadingPromises.set(viewType, loadPromise);
        return loadPromise;
    }

    /**
     * 預載所有介面 Prefab
     */
    public async preloadAllViews(): Promise<void> {
        // 自動提取 Enum 裡所有的 View 名稱
        const allViewTypes = Object.values(ViewType) as ViewType[];
        
        console.log(`[ViewManager] 開始預載 ${allViewTypes.length} 個 UI Prefab...`);
        await this.preloadViews(allViewTypes);
        console.log('[ViewManager] 所有 UI Prefab 預載完成！');
    }

    /**
     * 預載單一介面 Prefab
     */
    public async preloadView(viewType: ViewType): Promise<boolean> {
        const prefab = await this.loadPrefab(viewType);
        return !!prefab;
    }

    /**
     * 批次預載多個介面 Prefab
     */
    public async preloadViews(viewTypes: ViewType[]): Promise<void> {
        const promises = viewTypes.map((vt) => this.preloadView(vt));
        await Promise.all(promises);
    }

    /**
     * 開啟介面
     * @param viewType 介面類型
     * @param canvasType 掛載 Canvas 類型
     * @param isRecord 是否記錄在 openViews (關閉時能透過 ViewManager 關閉)
     * @param params 傳遞參數
     */
    public async openView<T extends BaseView>(
        viewType: ViewType, 
        canvasType: CanvasType, 
        isRecord: boolean = true, 
        params?: any
    ): Promise<T | null> {
        // 檢查該實例是否已經開啟在畫面上
        if (this.openViews.has(viewType)) {
            const existingView = this.openViews.get(viewType) as T;
            existingView.node.active = true;
            existingView.onOpen(params);
            return existingView;
        }

        // 從快取取得或進行載入 Prefab
        const prefab = await this.loadPrefab(viewType);
        if (!prefab) {
            return null;
        }

        // 取得目標 Canvas 與 Layer 設置
        let canvasNode: Node | null = null;
        let targetLayer = Layers.Enum.UI_2D;
        
        switch(canvasType) {
            case 'Canvas_Background':
                canvasNode = this.canvas_Background;
                targetLayer = Layers.BitMask['Canvas_Background'] ?? Layers.Enum.UI_2D;
                break;
            case 'HUD':
                canvasNode = this.canvas_HUD;
                targetLayer = Layers.BitMask['HUD'] ?? Layers.Enum.UI_2D;
                break;
            case 'Popup':
                canvasNode = this.canvas_Popup;
                targetLayer = Layers.BitMask['Popup'] ?? Layers.Enum.UI_2D;
                break;
            case 'Highest':
                canvasNode = this.canvas_Highest;
                targetLayer = Layers.BitMask['Highest'] ?? Layers.Enum.UI_2D;
                break;
        }

        if (!canvasNode) {
            console.error(`[ViewManager] 找不到對應的 Canvas 節點: ${canvasType}`);
            return null;
        }

        // 實例化 Prefab 並掛載到對應 Canvas
        const uiNode = instantiate(prefab);
        uiNode.parent = canvasNode;

        // 設置 Layer
        uiNode.walk((node) => {
            node.layer = targetLayer;
        });

        // 獲取 View 組件
        const viewComponent = uiNode.getComponent(viewType) as T;
        if (!viewComponent) {
            console.error(`[ViewManager] Prefab '${viewType}' 根節點上找不到對應組件！`);
            uiNode.destroy();
            return null;
        }

        // 初始化
        viewComponent.viewType = viewType;
        viewComponent.onOpen(params);

        if (isRecord) {
            this.openViews.set(viewType, viewComponent);
        }

        return viewComponent;
    }

    /**
     * 獲取目前已經開啟的介面實例
     */
    public getView<T extends BaseView>(viewType: ViewType): T | null {
        return (this.openViews.get(viewType) as T) || null;
    }

    /**
     * 關閉並銷毀指定的介面實例
     */
    public closeView(viewType: ViewType) {
        if (this.openViews.has(viewType)) {
            const view = this.openViews.get(viewType)!;
            view.onClose();
            this.openViews.delete(viewType);
        }
    }

    /**
     * 關閉所有已開啟的介面實例
     */
    public closeAllViews() {
        this.openViews.forEach((view) => {
            view.onClose();
        });
        this.openViews.clear();
    }

    /**
     * 手動釋放特定的 Prefab 快取或清空所有快取
     * @param viewType 若指定則只釋放該 Prefab，不傳則清空全部
     */
    public releaseCache(viewType?: ViewType) {
        if (viewType) {
            if (this.prefabCache.has(viewType)) {
                const prefab = this.prefabCache.get(viewType)!;
                resources.release(this.uiPrefabPath + viewType, Prefab);
                this.prefabCache.delete(viewType);
            }
        } else {
            this.prefabCache.forEach((prefab, vt) => {
                resources.release(this.uiPrefabPath + vt, Prefab);
            });
            this.prefabCache.clear();
        }
    }
}
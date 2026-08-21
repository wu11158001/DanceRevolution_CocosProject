import { _decorator, Component, Node, director } from 'cc';

const { ccclass } = _decorator;

/**
 * 單例模式基礎類別（Singleton Pattern）
 * @template T 泛型參數，指定單例的具體類型（必須繼承自 Component）
 */
@ccclass('SingletonComponent')
export abstract class SingletonComponent<T extends Component> extends Component {
    /**
     * 單例實例儲存容器
     */
    private static _instances: Map<Function, Component> = new Map();

    /**
     * 取得單例實例
     * @returns 單例實例
     */
    public static getInstance<T extends Component>(this: new () => T): T {
        let instance = SingletonComponent._instances.get(this) as T;

        // 若實例不存在，執行初始化流程
        if (!instance) {
            const node = new Node(this.name);
            instance = node.addComponent(this as unknown as new () => T);
            SingletonComponent._instances.set(this, instance);
            director.addPersistRootNode(node);
        }

        return instance;
    }

    protected onLoad(): void {
        const ctor = this.constructor;

        if (SingletonComponent._instances.has(ctor) && 
            SingletonComponent._instances.get(ctor) !== this) {
            // 發現重複實例，銷毀當前物件
            console.warn(`[SingletonComponent] 偵測到重複的單例實例: ${ctor.name}，已自動銷毀`);
            this.node.destroy();
            return;
        }

        // 註冊實例到快取
        SingletonComponent._instances.set(ctor, this);
        
        // 設定為持久化節點，跨場景不銷毀
        director.addPersistRootNode(this.node);
    }

    protected onDestroy(): void {
        const ctor = this.constructor;

        if (SingletonComponent._instances.get(ctor) === this) {
            SingletonComponent._instances.delete(ctor);
        }
    }
}
import { _decorator, Component, Node, director } from 'cc';

const { ccclass } = _decorator;

/**
 * 單例模式
 */
@ccclass('SingletonComponent')
export abstract class SingletonComponent<T extends Component> extends Component {
    private static _instances: Map<Function, Component> = new Map();

    /**
     * 取得單例實體（若不存在則自動於場景中建立 Node 並掛載）
     */
    public static getInstance<T extends Component>(this: new () => T): T {
        let instance = SingletonComponent._instances.get(this) as T;

        if (!instance) {
            const node = new Node(this.name);            
            instance = node.addComponent(this as unknown as new () => T);            
            SingletonComponent._instances.set(this, instance);
            director.addPersistRootNode(node);
        }

        return instance;
    }

    protected onLoad() {
        const ctor = this.constructor;
        if (SingletonComponent._instances.has(ctor) && SingletonComponent._instances.get(ctor) !== this) {
            this.node.destroy();
            return;
        }

        SingletonComponent._instances.set(ctor, this);
        director.addPersistRootNode(this.node);
    }

    protected onDestroy() {
        const ctor = this.constructor;
        if (SingletonComponent._instances.get(ctor) === this) {
            SingletonComponent._instances.delete(ctor);
        }
    }
}
import { _decorator, Camera, Component, Node, Prefab, resources, v3, Vec3 ,sys} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';

const { ccclass, property } = _decorator;

/**
 * 遊戲專用工具類
 */
@ccclass('GameTool')
export class GameTool extends SingletonComponent<GameTool> {
    /**
     * 動態載入 Prefab
     * @param path 
     * @returns 
     */
    public loadPrefab(path: string): Promise<Prefab | null> {
        return new Promise((resolve) => {
            resources.load(path, Prefab, (err, prefab) => {
                if (err) {
                    console.error(`[loadPrefab 失敗] 路徑: ${path}`, err);
                    resolve(null);
                } else {
                    resolve(prefab);
                }
            });
        });
    }

    private _tempWPos = v3();
    private _tempUIPos = v3();
    private _tempDir = v3();
    /**
     * 將 3D 物件的世界座標同步至 UI 節點
     */
    public follow3DNode(
        camera3D: Camera,
        target3D: Node,
        uiNode: Node,
        offset: Vec3 = Vec3.ZERO,
        dt: number = 0.016,
        smoothSpeed: number = 30,
        immediate: boolean = true // 強制立即歸位
    ): Vec3 | null {
        if (!camera3D || !target3D || !uiNode || !uiNode.parent) return null;

        // 計算目標 3D 世界座標
        target3D.getWorldPosition(this._tempWPos);
        this._tempWPos.add(offset);

        // 視錐體背面判定
        const cameraNode = camera3D.node;
        Vec3.subtract(this._tempDir, this._tempWPos, cameraNode.worldPosition);

        if (Vec3.dot(cameraNode.forward, this._tempDir) <= 0) {
            uiNode.active = false;
            return null;
        }

        // 轉為 UI 座標
        camera3D.convertToUINode(this._tempWPos, uiNode.parent, this._tempUIPos);
        this._tempUIPos.z = 0;

        // 首次顯示、強制立即定位、或平滑係數為 0 時直接歸位
        if (!uiNode.active || immediate || smoothSpeed <= 0) {
            uiNode.setPosition(this._tempUIPos);
            uiNode.active = true;
            return this._tempUIPos.clone();
        }

        // 指數平滑插值
        const currentPos = uiNode.position;
        const t = 1 - Math.exp(-smoothSpeed * dt);
        
        Vec3.lerp(this._tempUIPos, currentPos, this._tempUIPos, t);
        uiNode.setPosition(this._tempUIPos);

        return this._tempUIPos.clone();
    }

    /**
     * 格式化秒數為 02:30 的字串
     * @param seconds 
     * @returns 
     */
    public formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        // 先串接 "0"，再取最後兩位數
        const minsStr = ('0' + mins).slice(-2);
        const secsStr = ('0' + secs).slice(-2);

        return `${minsStr}:${secsStr}`;
    }

    /**
     * 格式化數字千分位
     * @param num 
     * @returns 
     */
    public formatNumber(num: number): string {
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 判斷平台
     * @returns // true=在手機瀏覽器 
     */
    public isMobileBrowser() :boolean {
        if (sys.isBrowser) {
            console.log(`判斷是否在手機平台: ${sys.isMobile}`);
            return sys.isMobile;
        }

        return false;
    }
}

import { _decorator, Camera, Component, Node, Prefab, resources, v3, Vec3} from 'cc';

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
     * @param camera3D 畫面的 3D 相機
     * @param target3D 追蹤的 3D 物件
     * @param uiNode 要移動的 UI 節點
     * @param offset 3D 空間中的頭頂偏移量 (預設為 0, 0, 0)
     * @returns 是否在相機前方（true: 在前方並已更新 UI 位置；false: 在相機後方，UI 應隱藏）
     */
    public follow3DNode(
        camera3D: Camera,
        target3D: Node,
        uiNode: Node,
        offset: Vec3 = Vec3.ZERO,
        outPos?: Vec3
    ): Vec3 | null {
        if (!camera3D || !target3D || !uiNode || !uiNode.parent) return null;

        // 強制更新 3D 物件與相機的世界矩陣
        target3D.updateWorldTransform();
        camera3D.node.updateWorldTransform();
        if (uiNode.parent) {
            uiNode.parent.updateWorldTransform();
        }

        // 計算目標 3D 位置
        target3D.getWorldPosition(this._tempWPos);
        this._tempWPos.add(offset);

        // 計算方向向量
        const cameraNode = camera3D.node;
        Vec3.subtract(this._tempDir, this._tempWPos, cameraNode.worldPosition);

        // 判斷是否在相機背後 (點積 <= 0 代表在相機背後或平行)
        if (Vec3.dot(cameraNode.forward, this._tempDir) <= 0) {
            uiNode.active = false;
            return null;
        }

        // 轉為 UI 本地座標並更新
        camera3D.convertToUINode(this._tempWPos, uiNode.parent, this._tempUIPos);
        uiNode.setPosition(this._tempUIPos);
        if (!uiNode.active) uiNode.active = true;

        if (outPos) {
            return outPos.set(this._tempUIPos);
        }
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
}

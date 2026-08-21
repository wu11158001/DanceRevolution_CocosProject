import { _decorator, Camera, Component, Node, Prefab, resources, v3, Vec3 ,sys, ScrollView, director, Director} from 'cc';

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
     * 將毫秒時間戳轉換為 yyyy/MM/dd HH:mm:ss 或 yyyy/MM/dd HH:mm
     * @param timestamp 
     * @param includeSeconds 
     * @returns 
     */
    public formatChatTimestamp(timestamp: number, includeSeconds: boolean = true): string {
        if (!timestamp || isNaN(timestamp)) return '';

        const date = new Date(timestamp);

        const year: number = date.getFullYear();
        const month: string = String(date.getMonth() + 1).padStart(2, '0');
        const day: string = String(date.getDate()).padStart(2, '0');
        const hours: string = String(date.getHours()).padStart(2, '0');
        const minutes: string = String(date.getMinutes()).padStart(2, '0');

        if (includeSeconds) {
            const seconds: string = String(date.getSeconds()).padStart(2, '0');
            return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }

        return `${year}/${month}/${day} ${hours}:${minutes}`;
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
            return sys.isMobile;
        }

        return false;
    }

    /**
     * 判斷 ScrollView 是否處於最底部
     * @param threshold 誤差容許範圍 (像素)，預設 5px
     */
    public isAtBottom(scrollView: ScrollView, threshold: number = 50): boolean {
        // 當前滾動偏移量
        const currentOffset = scrollView.getScrollOffset();
        // 最大可滾動偏移量
        const maxOffset = scrollView.getMaxScrollOffset();

        // 當 maxOffset.y 為 0 時代表內容長度未超過視窗，無須滾動（視為已在底部）
        if (maxOffset.y <= 0) return true;

        // Y 軸距離底部的剩餘像素值
        const distanceToBottom = maxOffset.y - currentOffset.y;

        return distanceToBottom <= threshold;
    }

    /**
     * 等待指定的幀數
     * @param frameCount 要等待的幀數
     */
    public waitFrames(frameCount: number = 2): Promise<void> {
        return new Promise((resolve) => {
        let count = 0;
        const check = () => {
            count++;
            if (count >= frameCount) {
                resolve();
            } else {
                // 利用 Component 的 scheduleOnce 或 Director 監聽 LateUpdate
                director.once(Director.EVENT_AFTER_UPDATE, check);
            }
        };
        director.once(Director.EVENT_AFTER_UPDATE, check);
    });
    }
}

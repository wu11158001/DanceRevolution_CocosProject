import { _decorator, Component, Node, resources, SpriteFrame } from 'cc';
import { SingletonComponent } from '../Extensions/SingletonComponent';
const { ccclass, property } = _decorator;

/**
 * 全域圖片資源管理器
 */
@ccclass('SpriteFrameManager')
export class SpriteFrameManager extends SingletonComponent<SpriteFrameManager> {
    /**
     * 貼圖資源快取
     */
    private stickMap: Map<string, SpriteFrame> = new Map();

    /**
     * 載入所有圖片資源
     * @returns Promise<void> 載入完成的 Promise
     */
    public async loadSpriteFrameAssets(): Promise<void> {
        // 目前僅載入貼圖資源
        // 未來可擴展載入其他類型的圖片資源
        await this.loadStickAssets();
    }

    /**
     * 獲取指定的貼圖 SpriteFrame
     * @param stick 貼圖名稱（檔案名稱，不含副檔名）
     * @returns SpriteFrame 資源，不存在時返回 undefined
     */
    public getStick(stick: string): SpriteFrame | undefined {
        return this.stickMap.get(stick);
    }

    /**
     * 獲取所有貼圖資源
     * @returns 貼圖快取 Map
     */
    public getAllStick(): Map<string, SpriteFrame> {
        return this.stickMap;
    }

    /**
     * 載入貼圖資源
     * @returns Promise<void> 載入完成的 Promise
     */
    private loadStickAssets(): Promise<void> {
        return new Promise((resolve, reject) => {
            // 批次載入 sticks 資料夾中的所有 SpriteFrame
            resources.loadDir('sticks', SpriteFrame, (err, stickList) => {
                if (err) {
                    console.error('[SpriteFrameManager] 載入貼圖資源失敗:', err);
                    return reject(err);
                }

                this.stickMap.clear();
                
                for (const spriteFrame of stickList) {
                    this.stickMap.set(spriteFrame.name, spriteFrame);
                }
                
                console.log(`[SpriteFrameManager] 成功載入 ${stickList.length} 個貼圖資源`);
                resolve();
            });
        });
    }
}



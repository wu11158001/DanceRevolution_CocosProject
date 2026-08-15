import { _decorator, Component, Node, resources, SpriteFrame } from 'cc';
import { SingletonComponent } from '../Extensions/SingletonComponent';
const { ccclass, property } = _decorator;

/**
 * 全域圖片靜態資料庫
 */
@ccclass('SpriteFrameManager')
export class SpriteFrameManager extends SingletonComponent<SpriteFrameManager> {
    // 貼圖
    private stickMap: Map<string, SpriteFrame> = new Map();

    /**
     * 載入所有圖片資源
     */
    public async loadSpriteFrameAssets(): Promise<void> {
        await this.loadStickAssets();
    }

    /**
     * 載入貼圖資源
     */
    private loadStickAssets(): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.loadDir('sticks', SpriteFrame, (err, stickList) => {
                if (err) return reject(err);

                this.stickMap.clear();
                for (const spriteFrame of stickList) {
                    this.stickMap.set(spriteFrame.name, spriteFrame);
                }
                resolve();
            });
        });
    }

    /**
     * 獲取貼圖
     */
    public getStick(stick: string): SpriteFrame {
        return this.stickMap.get(`${stick}`);
    }
}



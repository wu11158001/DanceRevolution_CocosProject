import { _decorator, Component, Node, resources, Prefab, instantiate, Animation, AnimationClip, NodePool, director, Director } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';

const { ccclass, property } = _decorator;

/**
 * 全域角色資料管理器
 */
@ccclass('CharacterDataManager')
export class CharacterDataManager extends SingletonComponent<CharacterDataManager> {
    /**
     * 角色動畫片段陣列
     */
    private characterClips: AnimationClip[][] = [];

    /**
     * 角色總數
     */
    private _characterCount: number = 0;
    
    /**
     * 角色總數存取器
     * @returns 可用的角色數量
     */
    public get characterCount(): number {
        return this._characterCount;
    }

    /**
     * 角色 Prefab 快取字典
     */
    private _characterPrefabs: Map<number, Prefab> = new Map();
    
    /**
     * 角色物件池快取字典
     */
    private _characterPools: Map<number, NodePool> = new Map();

    // ==================== 公開方法 ====================

    /**
     * 獲取指定角色的動畫片段陣列
     * @param index 角色索引
     * @returns 該角色的所有動畫 Clip
     */
    public getAnimationClips(index: number): AnimationClip[] {
        // 防禦性檢查：索引越界
        if (index < 0 || index >= this.characterClips.length) {
            console.error(`[CharacterDataManager] 獲取角色動畫錯誤，無效的索引: ${index}`);
            return [];
        }
        
        return this.characterClips[index];
    }

    /**
     * 預載入所有角色 Prefab
     * @returns Promise<void> 載入完成的 Promise
     */
    public preloadAllCharacters(): Promise<void> {
        return new Promise((resolve, reject) => {
            // 批次載入 CharacterPrefab 資料夾
            resources.loadDir('CharacterPrefab', Prefab, async (err, prefabs) => {
                if (err) {
                    console.error('[CharacterDataManager] 預載入角色 Prefab 失敗：', err);
                    reject(err);
                    return;
                }

                // 記錄角色總數
                this._characterCount = prefabs.length;
                
                // 清空現有資料
                this._characterPrefabs.clear();
                this._characterPools.clear();

                // 解析並快取每個 Prefab
                prefabs.forEach((prefab) => {
                    const nameParts = prefab.name.split('_');
                    const id = parseInt(nameParts[nameParts.length - 1]);

                    if (!isNaN(id)) {
                        this._characterPrefabs.set(id, prefab);
                        // 建立物件池
                        this._characterPools.set(id, new NodePool());
                    } else {
                        console.warn(`[CharacterDataManager] 無法解析角色 ID: ${prefab.name}`);
                    }
                });

                // 執行預熱流程
                try {
                    await this.warmupCharacters();
                    console.log('[CharacterDataManager] 預載入與預熱所有角色完成');
                    resolve();
                } catch (warmupErr) {
                    console.error('[CharacterDataManager] 角色預熱失敗：', warmupErr);
                    reject(warmupErr);
                }
            });
        });
    }

    /**
     * 角色預熱（強制 GPU 提交並填入物件池）
     * @returns Promise<void> 預熱完成的 Promise
     */
    public async warmupCharacters(): Promise<void> {
        const scene = director.getScene();
        if (!scene) {
            console.warn('[CharacterDataManager] 無法獲取場景，跳過預熱');
            return;
        }

        // 遍歷所有角色 Prefab
        for (const [id, prefab] of this._characterPrefabs) {
            // 創建角色實例
            const node = this.create(id);
            if (!node) continue;

            // 縮放為極小值，幾乎不可見
            // 但會觸發渲染管線，強制 GPU 準備資源
            node.setScale(0.0001, 0.0001, 0.0001);
            
            // 添加到場景，以便渲染管線處理
            scene.addChild(node);

            // 等待引擎完成一幀繪製
            await this.waitForNextFrame();

            // 恢復正常縮放
            node.setScale(1, 1, 1);
            
            // 從場景移除
            scene.removeChild(node);
            
            // 回收到物件池
            this.recycle(id, node);
        }
    }

    /**
     * 等待引擎完成下一幀繪製
     * @returns Promise<void> 下一幀完成的 Promise
     */
    private waitForNextFrame(): Promise<void> {
        return new Promise((resolve) => {
            // 註冊一次性事件監聽器
            // once：事件觸發後自動移除，避免記憶體洩漏
            director.once(Director.EVENT_AFTER_DRAW, () => {
                resolve();
            });
        });
    }

    /**
     * 創建/取得角色實例
     * @param index 角色索引
     * @returns 角色節點實例，失敗時返回 null
     */
    public create(index: number): Node | null {
        // 獲取該角色的物件池
        const pool = this._characterPools.get(index);
        
        // 優先從物件池取出預熱好的實例
        if (pool && pool.size() > 0) {
            return pool.get()!;
        }

        // 物件池已空，執行動態創建
        const prefab = this._characterPrefabs.get(index);
        if (!prefab) {
            console.error(`[CharacterDataManager] Prefab 未快取或載入失敗，索引: ${index}`);
            return null;
        }
        
        return instantiate(prefab);
    }

    /**
     * 回收角色實例到物件池
     * @param index 角色索引
     * @param node 要回收的角色節點
     */
    public recycle(index: number, node: Node): void {
        // 獲取該角色的物件池
        const pool = this._characterPools.get(index);
        
        if (pool) {
            // 歸還到物件池
            // NodePool 會自動處理節點的 active 狀態
            pool.put(node);
        } else {
            console.warn(`[CharacterDataManager] 找不到物件池，直接銷毀節點，索引: ${index}`);
            node.destroy();
        }
    }
}
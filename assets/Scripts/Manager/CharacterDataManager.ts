import { _decorator, Component, Node, resources, Prefab, instantiate, Animation, AnimationClip, NodePool, director, Director } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';

const { ccclass, property } = _decorator;

/**
 * 全域角色靜態資料庫
 */
@ccclass('CharacterDataManager')
export class CharacterDataManager extends SingletonComponent<CharacterDataManager> {
    // 角色動畫
    private characterClips: AnimationClip[][] = [];

    // 角色數量
    private _characterCount: number = 0;
    public get characterCount(): number {
        return this._characterCount;
    }

    // 角色Prefab字典
    private _characterPrefabs: Map<number, Prefab> = new Map();
    // 角色物件池快取
    private _characterPools: Map<number, NodePool> = new Map();

    /**
     * 獲取角色動畫
     * @param index 
     */
    public getAnimationClips(index: number) : AnimationClip[] {
        if(index < 0 || index >= this.characterClips.length) {
            console.error(`獲取角色動畫 錯誤: ${index}`);
        }
        
        return this.characterClips[index];
    }

    /**
     * 預載入所有角色 Prefab
     */
    public preloadAllCharacters(): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.loadDir('CharacterPrefab', Prefab, async (err, prefabs) => {
                if (err) {
                    console.error('預載入角色 Prefab 失敗：', err);
                    reject(err);
                    return;
                }

                this._characterCount = prefabs.length;
                this._characterPrefabs.clear();
                this._characterPools.clear();

                prefabs.forEach((prefab) => {
                    const nameParts = prefab.name.split('_');
                    const id = parseInt(nameParts[nameParts.length - 1]);

                    if (!isNaN(id)) {
                        this._characterPrefabs.set(id, prefab);
                        this._characterPools.set(id, new NodePool());
                    }
                });

                // 執行預熱
                try {
                    await this.warmupCharacters();
                    console.log('預載入與預熱所有角色完成');
                    resolve();
                } catch (warmupErr) {
                    reject(warmupErr);
                }
            });
        });
    }

    /**
     * 角色預熱（強制 GPU 提交並填入物件池）
     */
    public async warmupCharacters(): Promise<void> {
        const scene = director.getScene();
        if (!scene) return;

        for (const [id, prefab] of this._characterPrefabs) {
            const node =  this.create(id);
            node.setScale(0.0001, 0.0001, 0.0001);
            scene.addChild(node);

            await this.waitForNextFrame();

            node.setScale(1, 1, 1);
            scene.removeChild(node);
            this.recycle(id, node); 
        }
    }

    /**
     * 等待引擎完成下一幀繪製
     */
    private waitForNextFrame(): Promise<void> {
        return new Promise((resolve) => {
            director.once(Director.EVENT_AFTER_DRAW, () => {
                resolve();
            });
        });
    }

    /**
     * 創建/取得角色 (優先從物件池拿，沒有才 instantiate)
     */
    public create(index: number): Node | null {
        const pool = this._characterPools.get(index);
        
        // 取出已經預熱好的實例
        if (pool && pool.size() > 0) {
            return pool.get()!;
        }

        // 物件池沒了才進行動態生成
        const prefab = this._characterPrefabs.get(index);
        if (!prefab) {
            console.error(`Prefab 未快取或載入失敗: ${index}`);
            return null;
        }
        return instantiate(prefab);
    }

    /**
     * 回收角色回物件池
     */
    public recycle(index: number, node: Node) {
        const pool = this._characterPools.get(index);
        if (pool) {
            pool.put(node);
        } else {
            node.destroy();
        }
    }
}
import { _decorator, Component, Node, resources, Prefab, instantiate, AnimationClip } from 'cc';

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

    protected start() {
        // 載入所有角色動畫
        this.loadAllCharacterClips();
    }

    /**
     * 載入所有角色動畫
     * @returns 
     */
    public async loadAllCharacterClips(): Promise<void> {
        const totalGroups = 4;
        const loadPromises: Promise<void>[] = [];

        for (let i = 0; i < totalGroups; i++) {
            const folderName = `CharacterClips_${i}`;

            const promise = new Promise<void>((resolve) => {
                resources.loadDir(folderName, AnimationClip, (err, clips) => {
                    if (err) {
                        console.error(`[CharacterControl] 載入 ${folderName} 失敗:`, err);
                        this.characterClips[i] = [];
                        resolve();
                        return;
                    }
                    
                    this.characterClips[i] = clips;
                    console.log(`[CharacterControl] 成功載入 ${folderName}: ${clips.length} 個動畫檔`);
                    resolve();
                });
            });

            loadPromises.push(promise);
        }

        await Promise.all(loadPromises);
        console.log('[CharacterControl] 所有角色動畫載入完畢！');
    }

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
            resources.loadDir('CharacterPrefab', Prefab, (err, prefabs) => {
                if (err) {
                    console.error('預載入角色 Prefab 失敗：', err);
                    reject(err);
                    return;
                }

                this._characterCount = prefabs.length;
                this._characterPrefabs.clear();

                prefabs.forEach((prefab) => {
                    // 從檔名提取數字，例如 "Character_0" -> 0
                    const nameParts = prefab.name.split('_');
                    const id = parseInt(nameParts[nameParts.length - 1]);

                    if (!isNaN(id)) {
                        this._characterPrefabs.set(id, prefab);
                    } else {
                        console.warn(`Prefab 命名格式不符，無視：${prefab.name}`);
                    }
                });

                resolve();
            });
        });
    }

    /**
     * 創建角色
     */
    public create(index: number): Node | null {
        const prefab = this._characterPrefabs.get(index);
        if (!prefab) {
            console.error(`Prefab 未快取或載入失敗: ${index}`);
            return null;
        }
        return instantiate(prefab);
    }
}
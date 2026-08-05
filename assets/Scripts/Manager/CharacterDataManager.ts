import { _decorator, Component, Node, resources, Prefab, instantiate } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';

const { ccclass, property } = _decorator;

/**
 * 全域角色靜態資料庫
 */
@ccclass('CharacterDataManager')
export class CharacterDataManager extends SingletonComponent<CharacterDataManager> {

    // 角色數量
    private _characterCount: number = 0;
    public get characterCount(): number {
        return this._characterCount;
    }

    // 角色Prefab列表
    private _characterPrefabs: Map<number, Prefab> = new Map();

    /**
     * 預載入所有角色 Prefab
     */
    public preloadAllCharacters(): Promise<void> {
        return new Promise((resolve) => {
            resources.loadDir('CharacterPrefab', Prefab, (err, prefabs) => {
                if (err) {
                    console.error('預載入角色 Prefab 失敗：', err);
                    resolve();
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
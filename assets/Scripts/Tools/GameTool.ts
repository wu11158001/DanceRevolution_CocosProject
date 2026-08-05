import { _decorator, Component, Node, Prefab, resources} from 'cc';

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
}

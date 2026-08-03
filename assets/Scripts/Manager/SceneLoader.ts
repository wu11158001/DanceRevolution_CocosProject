import { _decorator, Component, Node, director} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { LobbyView } from '../View/LobbyScene/LobbyView';

const { ccclass, property } = _decorator;

export type SceneType = 'LobbyScene' | 'GameScene';

@ccclass('SceneLoader')
export class SceneLoader extends SingletonComponent<SceneLoader> {
    
    /**
     * 載入場景
     * @param sceneType 
     */
    public loadScene(sceneType: SceneType) {
        director.loadScene(sceneType, (err) => {
            if (err) {
                console.error(`跳轉場景失敗:`, err);
            } else {
                this.onLoadComplete(sceneType);
            }
        });
    }

    /**
     * 場景載入完成
     * @param sceneType 
     */
    private async onLoadComplete(sceneType: SceneType) {
        switch (sceneType) {
            case 'LobbyScene':
                await ViewManager.getInstance().openView<LobbyView>('LobbyView');
                break;

            case 'GameScene':

                break;

            default: {
                const _exhaustiveCheck: never = sceneType;
                console.error(`未處理的場景類型: ${_exhaustiveCheck}`);
                break;
            }
        }
    }
}



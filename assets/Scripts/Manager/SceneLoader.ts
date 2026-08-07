import { _decorator, Component, Node, director, UIOpacity, instantiate} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { AudioManager } from 'db://assets/Scripts/Manager/AudioManager';
import { GameManager } from 'db://assets/Scripts/Manager/GameManager';
import { LobbyView } from 'db://assets/Scripts/View/LobbyScene/LobbyView';

const { ccclass, property } = _decorator;

export type SceneType = 'LobbyScene' | 'GameScene';

@ccclass('SceneLoader')
export class SceneLoader extends SingletonComponent<SceneLoader> {
    @property(Node)
    private loadBg: Node = null;

    /**
     * 載入場景
     * @param sceneType 
     */
    public loadScene(sceneType: SceneType) {
        this.loadBg.active = true;

        director.loadScene(sceneType, (err) => {
            if (err) {
                console.error(`跳轉場景失敗:`, err);
                this.loadBg.active = false;
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
        ViewManager.getInstance().closeAllViews();

        switch (sceneType) {
            case 'LobbyScene':
                await ViewManager.getInstance().openView<LobbyView>('LobbyView', "HUD");
                    this.closeLoadBg();
                break;

            case 'GameScene':
                // 創建GameManager
                const obj = new Node('Gamemanager');
                const gameMgr = obj.addComponent(GameManager);
                const currentScene = director.getScene();
                if (currentScene) {
                    currentScene.addChild(obj);
                    obj.setPosition(0, 0, 0);
                }
                break;
        }
    }

    /**
     * 關閉遮罩背景
     */
    public closeLoadBg() {
        this.loadBg.active = false;
    }
}



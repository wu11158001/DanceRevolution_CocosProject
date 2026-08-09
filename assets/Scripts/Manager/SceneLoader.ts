import { _decorator, Component, Node, director, UIOpacity, instantiate} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { AudioManager } from 'db://assets/Scripts/Manager/AudioManager';
import { GameManager } from 'db://assets/Scripts/Manager/GameManager';
import { LobbyView } from 'db://assets/Scripts/View/LobbyScene/LobbyView';
import { RoomView } from '../View/LobbyScene/RoomView';

const { ccclass, property } = _decorator;

export type SceneType = 'LobbyScene' | 'GameScene';

@ccclass('SceneLoader')
export class SceneLoader extends SingletonComponent<SceneLoader> {
    @property(Node)
    private loadBg: Node = null;

    /**
     * 載入場景
     * @param sceneType 
     * @param isGameReturn // 是否由遊戲場景返回
     */
    public loadScene(sceneType: SceneType, isGameReturn: boolean = false) {
        this.loadBg.active = true;

        director.loadScene(sceneType, (err) => {
            if (err) {
                console.error(`跳轉場景失敗:`, err);
                this.loadBg.active = false;
            } else {
                this.onLoadComplete(sceneType, isGameReturn);
            }
        });
    }

    /**
     * 場景載入完成
     * @param sceneType 
     * @param isGameReturn 
     */
    private async onLoadComplete(sceneType: SceneType, isGameReturn: boolean = false) {
        ViewManager.getInstance().closeAllViews();

        switch (sceneType) {
            case 'LobbyScene':
                if(!isGameReturn) {
                    // 一般進入大廳,開啟大廳介面
                    await ViewManager.getInstance().openView<LobbyView>('LobbyView', "HUD"); 
                } else {
                    // 遊戲進入大廳,開啟房間介面
                    await ViewManager.getInstance().openView<RoomView>('RoomView', "HUD");
                }

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



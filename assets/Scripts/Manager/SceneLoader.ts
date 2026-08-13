import { _decorator, Component, Node, director, UIOpacity, instantiate} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { AudioManager, BGM_TYPE } from 'db://assets/Scripts/Manager/AudioManager';
import { GameManager } from 'db://assets/Scripts/Manager/GameManager';
import { LobbyView } from 'db://assets/Scripts/View/LobbyScene/LobbyView';
import { CharacterDataManager } from './CharacterDataManager';
import { RoomView } from '../View/LobbyScene/RoomView/RoomView';

const { ccclass, property } = _decorator;

export type SceneType = 'EntryScene' | 'LobbyScene' | 'GameScene';

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
        
        // 跳轉前的舊場景
        const previousScene = director.getScene()?.name as SceneType;

        director.loadScene(sceneType, (err) => {
            if (err) {
                console.error(`跳轉場景失敗:`, err);
                this.loadBg.active = false;
            } else {
                this.onLoadComplete(sceneType, previousScene, isGameReturn);
            }
        });
    }

    /**
     * 場景載入完成
     * @param sceneType 
     * @param isGameReturn 
     */
    private async onLoadComplete(sceneType: SceneType, previousScene: SceneType, isGameReturn: boolean = false) {
        ViewManager.getInstance().closeAllViews();

        switch (sceneType) {
            case 'LobbyScene':
                if(previousScene === 'EntryScene') {
                    // 載入所有角色3D
                    await CharacterDataManager.getInstance().preloadAllCharacters();
                }    

                await AudioManager.getInstance().playBGM(BGM_TYPE.LobbyBGM)

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
                AudioManager.getInstance().stopBGM();

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



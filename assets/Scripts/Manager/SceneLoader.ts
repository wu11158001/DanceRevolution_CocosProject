import { _decorator, Component, Node, director, UIOpacity, instantiate} from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { AudioManager } from 'db://assets/Scripts/Manager/AudioManager';
import { GameManager } from 'db://assets/Scripts/Manager/GameManager';
import { CharacterDataManager } from './CharacterDataManager';
import { RoomView } from '../View/LobbyScene/RoomView/RoomView';
import { SpriteFrameManager } from './SpriteFrameManager';
import { LobbyView } from '../View/LobbyScene/LobbyView/LobbyView';
import { GameTool } from '../Tools/GameTool';
import { SocketManager } from '../Network/SocketManager';
import { ChatManager } from './ChatManager';

const { ccclass, property } = _decorator;

export type SceneType = 'EntryScene' | 'LobbyScene' | 'GameScene';

@ccclass('SceneLoader')
export class SceneLoader extends SingletonComponent<SceneLoader> {
    @property(Node)
    private loadBg: Node = null;

    protected onLoad() {
        super.onLoad();

        // 監聽:切換場景請求
        director.on('REQ_LOAD_SCENE', this.onReqLoadScene, this);
        // 監聽:關閉載入遮罩
        director.on('REQ_CLOSE_LOAD_BG', this.closeLoadBg, this);
    }

    protected onDestroy() {
        director.off('REQ_LOAD_SCENE', this.onReqLoadScene, this);
        director.off('REQ_CLOSE_LOAD_BG', this.closeLoadBg, this);

        super.onDestroy();
    }

    private onReqLoadScene(sceneType: SceneType, isGameReturn: boolean = false) {
        this.loadScene(sceneType, isGameReturn);
    }

    /**
     * 載入場景
     * @param sceneType 
     * @param isGameReturn // 是否由遊戲場景返回
     */
    public loadScene(sceneType: SceneType, isGameReturn: boolean = false) {
        this.loadBg.active = true;

        const perScene = director.getScene()?.name;

        director.loadScene(sceneType, (err) => {
            if (err) {
                console.error(`跳轉場景失敗:`, err);
                this.loadBg.active = false;
            } else {
                this.onLoadComplete(sceneType, isGameReturn, perScene);
            }
        });
    }

    /**
     * 場景載入完成
     * @param sceneType 
     * @param isGameReturn 
     */
    private async onLoadComplete(sceneType: SceneType, isGameReturn: boolean = false, perScene: string) {
        ViewManager.getInstance().closeAllViews();

        switch (sceneType) {
            case 'EntryScene':
                SocketManager.getInstance().connectToServer();
                break;

            case 'LobbyScene':
                if(perScene === 'EntryScene') {
                    // 載入所有角色3D
                    await CharacterDataManager.getInstance().preloadAllCharacters();
                    // 載入圖片資源
                    await SpriteFrameManager.getInstance().loadSpriteFrameAssets();

                    // 聊天中心初始化
                    ChatManager.init();
                }    

                AudioManager.getInstance().playBGM('LobbyBGM')

                if(!isGameReturn) {
                    // 一般進入大廳,開啟大廳介面
                    await ViewManager.getInstance().openView<LobbyView>('LobbyView', "HUD"); 
                } else {
                    // 遊戲進入大廳,開啟房間介面
                    await GameTool.getInstance().waitFrames(1);
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
    private closeLoadBg() {
        this.loadBg.active = false;
    }
}



import { _decorator, director, Component, Node, Label, Button, Vec3 } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, ICreateRoomResponse } from 'db://assets/Scripts/Data/RoomData';
import { MessagePopupView } from 'db://assets/Scripts/View/Common/MessagePopupView';
import { UpdateNicknameView } from 'db://assets/Scripts/View/LobbyScene/UpdateNicknameView';
import { RoomView } from './RoomView/RoomView';

const { ccclass, property } = _decorator;

/**
 * 大廳介面
 */
@ccclass('LobbyView')
export class LobbyView extends BaseView {
    @property(Label)
    private label_nickname: Label = null;
    @property(Button)
    private btn_updateNickname: Button = null;
    @property(Button)
    private btn_CreateRoom: Button = null;
    @property(Button)
    private btn_QuickJoinRoom: Button = null;
    @property(Button)
    private btn_switchCharacterLeft: Button = null;
    @property(Button)
    private btn_switchCharacterRight: Button = null;

    private characterObj: Node = null;

    onDestroy() {
        PlayerData.off('nickname', this.showNickname);
        PlayerData.off('characterId', this.onCharacterChange, this);
        
        if(this.characterObj) {
            this.characterObj.destroy();
        }
        this.characterObj = null;
    }

    start() {
        // 修改暱稱按鈕
        this.btn_updateNickname.node.on(Button.EventType.CLICK, 
            () => {
                ViewManager.getInstance().openView<UpdateNicknameView>('UpdateNicknameView', 'Popup');
            }, this);

        // 創建房間按鈕
        this.btn_CreateRoom.node.on(Button.EventType.CLICK, () => {
            SocketManager.getInstance().sendCeateRoom({
                roomName: `${PlayerData.nickname} 的房間`,
                characterId: PlayerData.characterId
            }, (res: ICreateRoomResponse) => {
                if (res.success) {
                    ViewManager.getInstance().openView<RoomView>('RoomView', 'HUD');
                    this.closeSelf();
                } else {
                    console.error(`[創建房間失敗]: ${res.message}`);
                    ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                        popup?.setData("創建房間失敗!");
                    });
                }
            });
        }, this);

        // 快速加入按鈕
        this.btn_QuickJoinRoom.node.on(Button.EventType.CLICK, () => {
            SocketManager.getInstance().sendQuickJoin({
                characterId: PlayerData.characterId
            }, (res: { success: boolean; message?: string }) => {
                if (res && res.success) {
                    ViewManager.getInstance().openView<RoomView>('RoomView', 'HUD');
                    this.closeSelf();
                } else {
                    console.warn(`[快速加入失敗]: ${res?.message}`);
                    ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                        popup?.setData(res?.message || "加入房間失敗!");
                    });
                }
            });
        }, this);

        // 更換角色按鈕(左)
        this.btn_switchCharacterLeft.node.on(Button.EventType.CLICK, () => { PlayerData.switchCharacterId(-1) }, this);

        // 更換角色按鈕(右)
        this.btn_switchCharacterRight.node.on(Button.EventType.CLICK, () => { PlayerData.switchCharacterId(1) }, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 訂閱:玩家資料變更(暱稱)
        PlayerData.on('nickname', this.showNickname, this);
        // 訂閱:玩家資料變更(角色)
        PlayerData.on('characterId', this.onCharacterChange, this);

        this.showNickname();
        this.onCharacterChange();
    }

    /**
     * 顯示當前暱稱
     */
    private showNickname() {
        this.label_nickname.string = `暱稱: ${PlayerData.nickname}`;
    }

    /**
     * 角色變更事件
     */
    private onCharacterChange() {
        if(this.characterObj) {
            this.characterObj.destroy();
            this.characterObj = null;
        }

        const character = CharacterDataManager.getInstance().create(PlayerData.characterId);
        if (character) {
            this.characterObj = character;
            const currentScene = director.getScene();
            if (currentScene) {
                currentScene.addChild(this.characterObj);
                this.characterObj.setPosition(0, 0, 0);
            }
        }
    }
}
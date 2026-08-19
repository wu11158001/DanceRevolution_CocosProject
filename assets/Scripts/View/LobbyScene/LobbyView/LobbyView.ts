import { _decorator, director, Component, Node, Label, Button, Vec3 } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, ICreateRoomResponse } from 'db://assets/Scripts/Data/RoomData';
import { MessagePopupView } from 'db://assets/Scripts/View/Common/MessagePopupView';
import { UpdateNicknameView } from 'db://assets/Scripts/View/LobbyScene/UpdateNicknameView';
import { RoomView } from '../RoomView/RoomView';
import { ChatView } from '../../Common/ChatView/ChatView';
import { CHAT_PLACE } from '../../../Manager/ChatManager';
import { CharacterControl } from '../../../Game/CharacterControl';
import { RoomListView } from './RoomListView';

const { ccclass, property } = _decorator;

/**
 * 大廳介面
 */
@ccclass('LobbyView')
export class LobbyView extends BaseView {
    @property(Node)
    private bgNode: Node = null;

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
    @property(Button)
    private btn_changeAnim: Button = null;

    private characterObj: Node = null;
    private characterControl: CharacterControl = null;
    private chatView: ChatView = null;
    private roomListView: RoomListView = null;

    onDestroy() {
        PlayerData.off('nickname', this.showNickname, this);
        PlayerData.off('characterId', this.onCharacterChange, this);
        
        if(this.characterObj) {
            this.characterObj.destroy();
        }
        this.characterObj = null;

        this.bgNode.destroy();
        this.chatView?.onClose();
        this.roomListView?.onClose();
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

        // 切換角色動畫按鈕
        this.btn_changeAnim.node.on(Button.EventType.CLICK, this.onChangeCharacterAmimation, this);
    }

    public async onOpen(params?: any) {
        const [roomListView, chatView] = await Promise.all([
            // 開啟房間列表
            ViewManager.getInstance().openView<RoomListView>(
                'RoomListView', 
                'Popup',
                false),
                
            // 開啟聊天介面
            ViewManager.getInstance().openView<ChatView>(
                'ChatView', 
                'Popup', 
                false, 
                { chatPlace: CHAT_PLACE.LobbyVIew})
        ]);
        this.roomListView = roomListView;
        this.chatView = chatView;

        // 訂閱:玩家資料變更(暱稱)
        PlayerData.on('nickname', this.showNickname, this);
        // 訂閱:玩家資料變更(角色)
        PlayerData.on('characterId', this.onCharacterChange, this);

        this.bgNode.setParent(ViewManager.getInstance().BackgroundCanvas);

        this.showNickname();
        this.onCharacterChange();

        super.onOpen(params);
    }

    /**
     * 顯示當前暱稱
     */
    private showNickname() {
        this.label_nickname.string = `${PlayerData.nickname}`;
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
                this.characterObj.setScale(1.25, 1.25, 1.25);
            }

            this.characterControl = character.getComponent(CharacterControl);
        }
    }

    /**
     * 隨機更換角色動畫
     */
    private onChangeCharacterAmimation() {
        const randomNum = Math.floor(Math.random() * 14);
        const animName = `Dance_${randomNum}`;
        if(this.characterControl) {
            this.characterControl.playAnimation(animName);
        }
    }
}
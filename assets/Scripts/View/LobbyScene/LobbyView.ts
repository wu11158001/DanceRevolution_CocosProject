import { _decorator, Component, Node, Label, Button } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, ICreateRoomResponse } from 'db://assets/Scripts/Data/RoomData';
import { MessagePopupView } from 'db://assets/Scripts/View/Common/MessagePopupView';
import { UpdateNicknameView } from 'db://assets/Scripts/View/LobbyScene/UpdateNicknameView';
import { RoomView } from 'db://assets/Scripts/View/LobbyScene/RoomView';

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

    onDestroy() {        
        PlayerData.off('nickname', this.showNickname);
    }

    start() {
        // 修改暱稱按鈕
        this.btn_updateNickname.node.on(Button.EventType.CLICK, 
            () => {
                ViewManager.getInstance().openView<UpdateNicknameView>('UpdateNicknameView', 'HUD');
            }, this);

        // 創建房間按鈕
        this.btn_CreateRoom.node.on(Button.EventType.CLICK, () => {
            SocketManager.getInstance().sendCeateRoom(`${PlayerData.nickname} 的房間`, (res: ICreateRoomResponse) => {
                if (res.success) {
                    ViewManager.getInstance().openView<RoomView>('RoomView', 'HUD');
                } else {
                    console.error(`[創建房間失敗]: ${res.message}`);
                    ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                        popup?.setData("快速加入失敗!");
                    });
                }
            });
        }, this);

        // 快速加入按鈕
        this.btn_QuickJoinRoom.node.on(Button.EventType.CLICK, () => {
            SocketManager.getInstance().sendQuickJoin((res: { success: boolean; message?: string }) => {
                console.log('[快速加入回應]:', res);
                
                if (res && res.success) {
                    ViewManager.getInstance().openView<RoomView>('RoomView', 'HUD');
                } else {
                    console.warn(`[快速加入失敗]: ${res?.message}`);
                    ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                        popup?.setData(res?.message || "加入房間失敗!");
                    });
                }
            });
        }, this);

        // 訂閱:玩家資料變更(暱稱)
        PlayerData.on('nickname', this.showNickname, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.showNickname();
    }

    /**
     * 顯示當前暱稱
     */
    private showNickname() {
        this.label_nickname.string = `暱稱: ${PlayerData.nickname}`;
    }
}
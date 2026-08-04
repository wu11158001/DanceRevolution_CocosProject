import { _decorator, Button, Component, Label, Node } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';
import { LobbyView } from 'db://assets/Scripts/View/LobbyScene/LobbyView';
import { UpdateRoomNameView } from 'db://assets/Scripts/View/LobbyScene/UpdateRoomNameView';

const { ccclass, property } = _decorator;

/**
 * 房間介面
 */
@ccclass('RoomView')
export class RoomView extends BaseView {
    @property(Label)
    private label_roomName: Label = null;
    @property(Button)
    private btn_updateRoomName: Button = null;
    @property(Button)
    private btn_exit: Button = null;
    @property(Button)
    private btn_readyOrStart: Button = null;
    @property(Label)
    private label_readyOrStart: Label = null;

    start() {
        // 更新房間名稱按鈕
        this.btn_updateRoomName.node.on(Button.EventType.CLICK, 
            () =>{
                ViewManager.getInstance().openView<UpdateRoomNameView>('UpdateRoomNameView', 'HUD');
            }, this);

        // 離開按鈕
        this.btn_exit.node.on(Button.EventType.CLICK, 
            () =>{
                SocketManager.getInstance().sendLeaveRoom();
                ViewManager.getInstance().openView<LobbyView>('LobbyView', 'HUD').then(lobbyView => {
                    this.closeSelf();
                });                
            }, this);

        // 準備/開始按鈕
        this.btn_readyOrStart.node.on(Button.EventType.CLICK,
            () => {
                if(PlayerData.isHost) {
                    SocketManager.getInstance().sendStartGame();
                } else {
                    SocketManager.getInstance().sendToggleReady();
                }
            }, this);
    }

    public onClose(): void {
        RoomData.onRoomUpdated = null;
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        RoomData.onRoomUpdated = (data: IRoomUpdatedData) => {
            this.refreshRoom(data);
        }

        // 初始化畫面
        if (RoomData.roomId) {
            this.refreshRoom({
                roomId: RoomData.roomId,
                roomName: RoomData.roomName,
                hostId: RoomData.hostId,
                players: RoomData.players
            });
        }
    }

    /**
     * 刷新房間
     * @param data 
     */
    private refreshRoom(data: IRoomUpdatedData) {
        this.label_roomName.string = `房間: ${data.roomName}`;

        let isCanStart = true;

        // 所有玩家狀態
        data.players.forEach(player => {
            console.log(`Slot ${player.slotId}: ${player.nickname} | 房主:${player.isHost} | 準備:${player.isReady}`);
           
            if(!player.isReady) isCanStart = false;
        });

        // 按鈕設置
        const isHost = PlayerData.isHost;
        if(isHost) {
            this.label_readyOrStart.string = "開始遊戲";
            this.btn_readyOrStart.interactable = isCanStart;
            this.btn_updateRoomName.node.active = true;
        } else {
            this.label_readyOrStart.string = PlayerData.isReady ? "取消準備" : "準備";
            this.btn_readyOrStart.interactable = true;
            this.btn_updateRoomName.node.active = false;
        }
    }
}



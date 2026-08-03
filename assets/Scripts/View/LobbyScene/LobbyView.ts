import { _decorator, Component, Node, Label, Button } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';

const { ccclass, property } = _decorator;

@ccclass('LobbyView')
export class LobbyView extends BaseView {
    @property(Label)
    private label_nickname: Label = null;
    @property(Button)
    private btn_updateNickname: Button = null;

    public onClose() {
        this.btn_updateNickname.node.off(Button.EventType.CLICK, this.onUpdateNicknameClick, this);

        PlayerData.off('nickname', this.showNickname);
    }

    public onOpen(params?: any) {
        this.btn_updateNickname.node.on(Button.EventType.CLICK, this.onUpdateNicknameClick, this);

        PlayerData.on('nickname', this.showNickname, this);
        this.showNickname();
    }

    /**
     * 顯示當前暱稱
     */
    private showNickname() {
        this.label_nickname.string = `暱稱: ${PlayerData.nickname}`;
    }

    /**
     * 修改暱稱按鈕點擊
     */
    private onUpdateNicknameClick() {
        SocketManager.getInstance().sendUpdateNickname("新玩家");
    }
}
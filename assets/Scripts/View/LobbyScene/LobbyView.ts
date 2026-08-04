import { _decorator, Component, Node, Label, Button } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { UpdateNicknameView } from './UpdateNicknameView';

const { ccclass, property } = _decorator;

@ccclass('LobbyView')
export class LobbyView extends BaseView {
    @property(Label)
    private label_nickname: Label = null;
    @property(Button)
    private btn_updateNickname: Button = null;

    onDestroy() {        
        PlayerData.off('nickname', this.showNickname);
    }

    start() {
        this.btn_updateNickname.node.on(Button.EventType.CLICK, this.onUpdateNicknameClick, this);

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

    /**
     * 修改暱稱按鈕點擊
     */
    private async onUpdateNicknameClick() {
        await ViewManager.getInstance().openView<UpdateNicknameView>('UpdateNicknameView', 'HUD');
    }
}
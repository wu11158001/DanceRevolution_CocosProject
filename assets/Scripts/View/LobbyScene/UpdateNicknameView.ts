import { _decorator, Button, Component, EditBox, Node } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';

const { ccclass, property } = _decorator;

@ccclass('UpdateNicknameView')
export class UpdateNicknameView extends BaseView {
    @property(EditBox)
    private editBox_nickname: EditBox = null;
    @property(Button)
    private btn_confirm: Button = null;

    start() {
        this.editBox_nickname.node.on(EditBox.EventType.TEXT_CHANGED, this.onTextChange, this);
        this.editBox_nickname.node.on(EditBox.EventType.EDITING_RETURN, this.onConfirmClick, this);
        this.btn_confirm.node.on(Button.EventType.CLICK, this.onConfirmClick, this);
    }

    protected onLoad() {
        super.onLoad();

        this.btn_confirm.interactable = false;
    }

    /**
     * 輸入框文字變更
     * @param editBox 
     */
    private onTextChange(editBox: EditBox) {
        const text = editBox.string.trim();

        this.btn_confirm.interactable = text.length > 0;
    }

    /**
     * 點擊確認按鈕
     */
    private onConfirmClick() {
        const newNickname = this.editBox_nickname.string.trim();

        if(newNickname.length == 0) return;

        SocketManager.getInstance().sendUpdateNickname(newNickname);
        this.closeSelf();
    }
}



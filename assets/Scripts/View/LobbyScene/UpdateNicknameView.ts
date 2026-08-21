import { _decorator, Button, Component, EditBox, Node } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { AudioManager, SFX_TYPE } from '../../Manager/AudioManager';

const { ccclass, property } = _decorator;

/**
 * 編輯暱稱介面
 */
@ccclass('UpdateNicknameView')
export class UpdateNicknameView extends BaseView {
    @property(Button)
    private btn_close: Button = null;
    @property(EditBox)
    private editBox_nickname: EditBox = null;
    @property(Button)
    private btn_confirm: Button = null;

    start() {
        // 關閉按鈕
        this.btn_close.node.on(Button.EventType.CLICK, this.closeSelf, this);
        // 輸入框內容變更
        this.editBox_nickname.node.on(EditBox.EventType.TEXT_CHANGED, this.onTextChange, this);
        // 輸入框Enter按下
        this.editBox_nickname.node.on(EditBox.EventType.EDITING_RETURN, this.onConfirmClick, this);
        // 確認按鈕
        this.btn_confirm.node.on(Button.EventType.CLICK, this.onConfirmClick, this);
    }

    protected onLoad() {
        super.onLoad();

        this.btn_confirm.interactable = false;
    }

    public async onOpen(params?: any): Promise<void> {
        super.onOpen(params);

        this.editBox_nickname.focus();
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



import { _decorator, Component, Node, Button, Label } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';

const { ccclass, property } = _decorator;

@ccclass('MessagePopupView')
export class MessagePopupView extends BaseView {
    
    @property(Label)
    private label_content: Label = null;

    @property(Button)
    private btn_cancel: Button = null;
    @property(Label)
    private label_cancel: Label = null;

    @property(Button)
    private btn_confirm: Button = null;
    @property(Label)
    private label_confirm: Label = null;

    private confirmCallback: (() => void) | null = null;
    private cancalCallback: (() => void) | null = null;

    start() {
        this.btn_cancel.node.on(Button.EventType.CLICK, this.onCancelClick, this);
        this.btn_confirm.node.on(Button.EventType.CLICK, this.onConfirmClick, this);
    }

    public setData(
        contentString: string, 
        confirmCallback?: (() => void) | null,
        cancalCallback?: (() => void) | null,
        isShowCancel: boolean = false,
        confirmBtnString: string = "確認",
        cancelBtnString: string = "取消"
    ) {
        this.confirmCallback = confirmCallback ?? null;
        this.cancalCallback = cancalCallback ?? null;

        if (this.label_content) {
            this.label_content.string = contentString;
        }

        if (this.label_cancel) {
            this.label_cancel.string = cancelBtnString;
        }

        if (this.label_confirm) {
            this.label_confirm.string = confirmBtnString;
        }

        if (this.btn_cancel && this.btn_cancel.node) {
            this.btn_cancel.node.active = isShowCancel;
        }
    }

    /**
     * 點擊取消按鈕
     */
    private onCancelClick() {
        if (this.cancalCallback) {
            this.cancalCallback();
        }

        this.closeSelf();
    }

    /**
     * 點擊確認按鈕
     */
    private onConfirmClick() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }

        this.closeSelf();
    }
}



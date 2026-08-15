import { _decorator, Component, Enum, Node, UIOpacity, tween } from 'cc';
import { ChatFullView } from './ChatFullView';
import { BaseView } from '../../BaseView';
import { CHAT_PLACE, ChatChannel, IChatPanelType } from '../../../Manager/ChatManager';
import { ChatShortView } from './ChatShortView';
const { ccclass, property } = _decorator;

/**
 * 聊天介面
 */
@ccclass('ChatView')
export class ChatView extends BaseView {
    @property(ChatFullView)
    private chatFullView: ChatFullView = null;
    @property(UIOpacity)
    private uiOpacity_chatFull: UIOpacity = null;

    @property(ChatShortView)
    private chatShortView: ChatShortView = null;
    @property(UIOpacity)
    private uiOpacity_chatShort: UIOpacity = null;

    private isFirst = true;

    public async onOpen(params?: {chatPlace: CHAT_PLACE}): Promise<void> {
        if (!params) return;

        this.chatFullView.setData(params.chatPlace, (targetPanel: IChatPanelType, targetChannel: ChatChannel) => {
            this.onSwitchPanel(targetPanel, targetChannel)
        });

        this.chatShortView.setData(params.chatPlace, (targetPanel: IChatPanelType, targetChannel: ChatChannel) => {
            this.onSwitchPanel(targetPanel, targetChannel)
        });

        switch(params.chatPlace) {
            case CHAT_PLACE.LobbyVIew:
                this.onSwitchPanel(IChatPanelType.Full, 'global');
                break;

            case CHAT_PLACE.RoomView:
                this.onSwitchPanel(IChatPanelType.Short, 'room');
                break;
        }

        super.onOpen(params);
    }

    /**
     * 切換面板
     * @param openPanelType 目標開啟的面板
     * @param targetChannel 目標頻道
     */
    private onSwitchPanel(openPanelType: IChatPanelType, targetChannel: ChatChannel) {
        let uiOpacity: UIOpacity = null;

        switch(openPanelType) {
            case IChatPanelType.Full:
                this.chatFullView.node.active = true;
                this.chatShortView.node.active = false;

                uiOpacity = this.uiOpacity_chatFull;

                this.chatFullView.openSet(targetChannel);
                break;

            case IChatPanelType.Short:
                this.chatFullView.node.active = false;
                this.chatShortView.node.active = true;

                uiOpacity = this.uiOpacity_chatShort

                this.chatShortView.openSet(targetChannel);                
                break;
        }

        if(this.isFirst) {
            this.isFirst = false;
        } else {
            uiOpacity.opacity = 0;
            this.doFade(uiOpacity, 255);
        }
    }

    /**
     * 淡入淡出效果
     * @param uiOpacity 
     */
    private doFade(uiOpacity: UIOpacity, value: number) {
        tween(uiOpacity)
            .to(0.35, {opacity: value})
            .start();
    }
}



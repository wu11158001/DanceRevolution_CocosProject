import { _decorator, Component, Enum, Node } from 'cc';
import { ChatFullView } from './ChatFullView';
import { BaseView } from '../../BaseView';
import { CHAT_PLACE } from '../../../Manager/ChatManager';
const { ccclass, property } = _decorator;


/**
 * 聊天介面
 */
@ccclass('ChatView')
export class ChatView extends BaseView {
    @property(ChatFullView)
    private chatFullView: ChatFullView = null;

    public async onOpen(params?: {chatPlace: CHAT_PLACE}): Promise<void> {
        if (!params) return;

        this.chatFullView.node.active = false;

        switch(params.chatPlace) {
            case CHAT_PLACE.LobbyVIew:
                this.chatFullView.node.active = true;
                break;

            case CHAT_PLACE.RoomView:
                this.chatFullView.node.active = true;
                break;
        }

        this.chatFullView.setData(params.chatPlace);

        super.onOpen(params);
    }
}



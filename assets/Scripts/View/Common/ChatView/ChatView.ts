import { _decorator, Component, Enum, Node } from 'cc';
import { ChatFullView } from './ChatFullView';
import { BaseView } from '../../BaseView';
const { ccclass, property } = _decorator;

/**
 * 聊天區域
 */
export enum CHAT_PLACE {
    LobbyVIew,
    RoomView
}

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
                break;
        }

        super.onOpen(params);
    }
}



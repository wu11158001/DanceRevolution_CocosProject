import { _decorator, Button, Component, EditBox, instantiate, Node, ScrollView, Toggle, ToggleContainer } from 'cc';
import { CHAT_PLACE, ChatChannel, ChatManager, IChatMessageData } from '../../../Manager/ChatManager';
import { ChatItemView } from './ChatItemView';
import { GameTool } from '../../../Tools/GameTool';
const { ccclass, property } = _decorator;

/**
 * 聊天介面完整顯示面板
 */
@ccclass('ChatFullView')
export class ChatFullView extends Component {
    @property(EditBox)
    private editBox: EditBox = null;
    @property(Button)
    private btn_send: Button = null;

    @property(ScrollView)
    private scrollView: ScrollView = null;     

    @property(ToggleContainer)
    private toggleContainer_channel: ToggleContainer = null;
    @property(Toggle)
    private tag_global: Toggle = null;
    @property(Toggle)
    private tag_room: Toggle = null;
    @property(Toggle)
    private tag_recruit: Toggle = null;

    @property(Node)
    private chatItemParent: Node = null;
    @property(Node)
    private chatItemPrefab: Node = null;

    @property(Button)
    private btn_newMessage: Button = null;

    // 聊天項目物件池
    private chatItemPool: ChatItemView[] = [];

    protected onDestroy(): void {
        this.offListener();
    }

    protected onDisable(): void {
        this.offListener();
    }

    /**
     * 監聽移除
     */
    private offListener() {
        ChatManager.targetOff(this);
    }

    protected onEnable(): void {
        // 綁定:新訊息接收
        ChatManager.on('ON_MESSAGE_RECEIVED', this.reciveMessage, this);
    }

    protected start(): void {
        this.editBox.node.on(EditBox.EventType.EDITING_RETURN, this.sendTextMessage, this);
        this.btn_send.node.on(Button.EventType.CLICK, this.sendTextMessage, this);     
        
        this.tag_global.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('global') }, this);
        this.tag_room.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('room') }, this);
        this.tag_recruit.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('recruit') }, this);

        this.btn_newMessage.node.on(Button.EventType.CLICK, this.toBottom, this);

        this.scrollView.node.on('scrolling', this.onScrollViewScroll, this);

        this.chatItemPrefab.active = false;
        this.btn_newMessage.node.active = false;
    }

    public setData(chatPlace: CHAT_PLACE) {
        // 判斷聊天所在介面
        this.tag_global.node.active = true;
        switch(chatPlace) {
            case CHAT_PLACE.LobbyVIew:
                this.tag_room.node.active = false;
                this.tag_recruit.node.active = true;

                this.tag_global.isChecked = true;
                break;

            case CHAT_PLACE.RoomView:
                this.tag_room.node.active = true;
                this.tag_recruit.node.active = false;

                this.tag_room.isChecked = true;
                break;
        }
    }

    /**
     * 頻道變更
     * @param channel 
     */
    private onChannelChange(channel: ChatChannel) {
        let datas = [];

        switch(channel) {
            case 'global':
                datas = ChatManager.getGlobaMessageData();
                break;

            case 'room':
                datas = ChatManager.getRoomMessageData();
                break;

            case 'recruit':
                break;
        }

        if(datas) {
            this.showChatMessage(datas);
            this.toBottom();
        }
    }

    /**
     * 顯示聊天訊息
     * @param datas 
     */
    private showChatMessage(datas: IChatMessageData[]) {
        // 影藏當前所有項目
        this.chatItemPool.forEach((item) => {
            item.node.active = false;
        });

        // 設置顯示
        datas.forEach((data, index) => {
            if(index < this.chatItemPool.length) {
                this.chatItemPool[index].node.active = true;
                this.chatItemPool[index].setData(data)
            } else {
                this.createChatItem(data);
            }
        });
    }

    /**
     * 創建聊天項目
     * @param data 
     */
    private createChatItem(data: IChatMessageData) {
        const obj = instantiate(this.chatItemPrefab);
        obj.active = true;
        obj.setParent(this.chatItemParent);

        const chatItemView = obj.getComponent(ChatItemView);
        if(chatItemView) {
            chatItemView.setData(data);
            this.chatItemPool.push(chatItemView);
        }
    }

    /**
     * 接收到新訊息(文字/貼圖)
     * @param data 
     */
    private reciveMessage(data: IChatMessageData) {
        this.createChatItem(data);

        // 判斷當前是否在最底部
        const isAtBottom = GameTool.getInstance().isAtBottom(this.scrollView);
        if (isAtBottom) {
            // 若本來就在最底部，自動跟隨滾動至底
            this.toBottom();
        } else {
            // 若不在最底部，顯示新訊息提示按鈕
            this.btn_newMessage.node.active = true;
        }
    }

    /**
     * 顯示最新訊息
     */
    private toBottom() {
        this.scheduleOnce(() => {
            this.scrollView.scrollToBottom(0.1);
        }, 0);
    }

    /**
     * 監聽玩家手動滑動 ScrollView 的過程
     */
    private onScrollViewScroll() {
        // 如果新訊息提示按鈕正在顯示，且玩家手動滑到了最底部，則關閉顯示
        if (this.btn_newMessage.node.active && GameTool.getInstance().isAtBottom(this.scrollView)) {
            this.btn_newMessage.node.active = false;
        }
    }

    /**
     * 獲取當前頻道
     * @returns 
     */
    public getActiveToggleTag(): ChatChannel | null {
        // 取得目前所有開啟的 Toggle（Container 設定單選時長度只會是 1）
        const activeToggles = this.toggleContainer_channel.activeToggles();
        
        if (activeToggles.length === 0) {
            console.error("沒有任何 頻道Toggle 被選中");
            return null;
        }

        const currentToggle = activeToggles[0];

        // 直接與屬性比對
        switch (currentToggle) {
            case this.tag_global:
                return 'global';

            case this.tag_room:
                return 'room';

            case this.tag_recruit:
                return 'recruit';

            default:
                console.error("無法獲取頻道");
                return null;
        }
    }

    /**
     * 發送文字訊息
     */
    private sendTextMessage() {
        const channel = this.getActiveToggleTag();
        const content = this.editBox.string.trim();

        if(channel && content.length > 0) {
            ChatManager.sendChatMessage({
                channel: channel, 
                type: 'text', 
                content: content
            });
        }

        
        this.editBox.string = '';

        // 電腦上重設焦點
        if(!GameTool.getInstance().isMobileBrowser()) {
            setTimeout(() => {
                if (this.node && this.node.isValid && this.editBox) {
                    this.editBox.focus();
                }
            }, 1);
        }
    }
}



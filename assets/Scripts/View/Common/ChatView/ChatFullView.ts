import { _decorator, Button, Component, EditBox, instantiate, Node, ScrollView, SpriteFrame, Toggle, ToggleContainer } from 'cc';
import { CHAT_PLACE, ChatChannel, ChatManager, IChatMessageData, IChatPanelType } from '../../../Manager/ChatManager';
import { ChatItemView } from './ChatItemView';
import { GameTool } from '../../../Tools/GameTool';
import { SpriteFrameManager } from '../../../Manager/SpriteFrameManager';
import { StickItemView } from './StickItemView';
const { ccclass, property } = _decorator;

/**
 * 聊天介面-完整顯示面板
 */
@ccclass('ChatFullView')
export class ChatFullView extends Component {
    @property(Node)
    private inputNode: Node = null;
    @property(EditBox)
    private editBox: EditBox = null;
    @property(Button)
    private btn_send: Button = null;

    @property(Button)
    private btn_close: Button = null;

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

    @property(Button)
    private btn_sticker: Button = null;
    @property(Node)
    private stickGroupNode: Node = null;
    @property(Node)
    private stickItemParent: Node = null;
    @property(Node)
    private stickItemPrefab: Node = null;

    // 聊天項目物件池
    private chatItemPool: ChatItemView[] = [];
    // 關閉Action
    private closeAction: (targetPanel: IChatPanelType, currentChannel: ChatChannel) => void = null;

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
        // 綁定:新聊天訊息接收
        ChatManager.on('ON_MESSAGE_RECEIVED', this.reciveMessage, this);
        // 綁定:招募列表訊息接收
        ChatManager.on('ON_RECRUIT_LIST_RECEIVED', (datas: IChatMessageData[]) => {
            if(this.getActiveToggleTag() === 'recruit') {
                this.showMessage(datas);
            }  
        }, this);
    }

    protected start(): void {
        // 輸入框Enter
        this.editBox.node.on(EditBox.EventType.EDITING_RETURN, this.sendTextMessage, this);
        // 發送按鈕
        this.btn_send.node.on(Button.EventType.CLICK, this.sendTextMessage, this);     
        
        // 頻道標籤Toggle
        this.tag_global.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('global') }, this);
        this.tag_room.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('room') }, this);
        this.tag_recruit.node.on(Toggle.EventType.TOGGLE, (tog) => { this.onChannelChange('recruit') }, this);

        // 新訊息按鈕
        this.btn_newMessage.node.on(Button.EventType.CLICK, this.toBottom, this);

        // 滑條滑動偵測
        this.scrollView.node.on('scrolling', this.onScrollViewScroll, this);

        // 貼圖開關按鈕
        this.btn_sticker.node.on(Button.EventType.CLICK, this.switchStickPanel, this);

        // 關閉按鈕
        this.btn_close.node.on(Button.EventType.CLICK, () => { 
            this.closeAction?.(IChatPanelType.Short, this.getActiveToggleTag());
        }, this);

        this.chatItemPrefab.active = false;
        this.btn_newMessage.node.active = false;

        this.stickItemPrefab.active = false;
        this.stickGroupNode.active = false;

        this.createStickItem();
    }

    public setData(chatPlace: CHAT_PLACE, 
        closeAction: (targetPanel: IChatPanelType, currentChannel: ChatChannel) => void
    ) {
        this.closeAction = closeAction;

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

        // 獲取招募資料
        ChatManager.sendGetRecruitList();
    }

    /**
     * 面板開啟設定
     * @param targetChannel 
     */
    public openSet(targetChannel: ChatChannel) {
        switch(targetChannel) {
            case 'global':
                this.tag_global.isChecked = true;
                break;

            case 'room':
                this.tag_room.isChecked = true;
                break;

            case 'recruit':
                this.tag_recruit.isChecked = true;
                break;
        }

        // 獲取招募資料
        //ChatManager.sendGetRecruitList();
    }

    /**
     * 創建貼圖項目
     */
    private createStickItem() {
        const stickMap = SpriteFrameManager.getInstance().getAllStick();

        for (const stickName of stickMap.keys()) {
            const obj = instantiate(this.stickItemPrefab);
            obj.active = true;
            obj.setParent(this.stickItemParent);

            const stickItemView = obj.getComponent(StickItemView);
            if(stickItemView) {
                stickItemView.setData(stickName, (stickName) => {
                    this.sendStickMessage(stickName);
                });
            }
        }
    }

    /**
     * 貼圖面板開關
     */
    private switchStickPanel() {
        this.stickGroupNode.active = !this.stickGroupNode.active;
    }

    /**
     * 頻道變更
     * @param channel 
     */
    private onChannelChange(channel: ChatChannel) {
        let datas = [];

        switch(channel) {
            case 'global':
                this.inputNode.active = true;
                datas = ChatManager.getGlobaMessageData();
                break;

            case 'room':
                this.inputNode.active = true;
                datas = ChatManager.getRoomMessageData();
                break;

            case 'recruit':
                this.inputNode.active = false;
                datas = ChatManager.getRecruitData();
                break;
        }

        if(datas) {
            this.showMessage(datas);
            this.toBottom();
        }
    }

    /**
     * 顯示訊息
     * @param datas 
     */
    private showMessage(datas: IChatMessageData[]) {
        if (!datas || !Array.isArray(datas)) {
            datas = [];
        }

        let poolIndex = 0;
        for (const data of datas) {
            // 頻道不符時直接跳過
            if (data.channel !== this.getActiveToggleTag()) {
                continue;
            }

            // 依據過濾後的實際數量來使用 Pool
            if (poolIndex < this.chatItemPool.length) {
                this.chatItemPool[poolIndex].node.active = true;
                this.chatItemPool[poolIndex].setData(data);
            } else {
                this.createChatItem(data);
            }
            
            poolIndex++;
        }

        // 隱藏沒用到的剩餘Item
        for (let i = poolIndex; i < this.chatItemPool.length; i++) {
            this.chatItemPool[i].node.active = false;
        }
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

        if(channel && channel != 'recruit' && content.length > 0) {
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

    /**
     * 發送貼圖訊息
     */
    private sendStickMessage(stickName: string) {
        const channel = this.getActiveToggleTag();

        if(stickName) {
            ChatManager.sendChatMessage({
                channel: channel, 
                type: 'sticker', 
                content: stickName
            });
        }

        // 電腦上重設焦點
        if(!GameTool.getInstance().isMobileBrowser()) {
            setTimeout(() => {
                if (this.node && this.node.isValid && this.editBox) {
                    this.editBox.focus();
                }
            }, 1);
        }

        this.stickGroupNode.active = false;
    }
}



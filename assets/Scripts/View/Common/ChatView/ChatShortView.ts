import { _decorator, Button, Component, Label, Node, RichText, UITransform } from 'cc';
import { CHAT_PLACE, ChatChannel, ChatManager, IChatMessageData, IChatPanelType } from '../../../Manager/ChatManager';
const { ccclass, property } = _decorator;

/**
 * 聊天介面-簡短面板
 */
@ccclass('ChatShortView')
export class ChatShortView extends Component {
    @property(Label)
    private label_currentChannel: Label = null;
    @property(Button)
    private btn_channel: Button = null;
    @property(Button)
    private btn_expand: Button = null;
    @property(RichText)
    private richText_message: RichText = null;
    @property(UITransform)
    private richTextTransform: UITransform = null;

    private currentChatPlace: CHAT_PLACE = CHAT_PLACE.LobbyVIew;
    private currentChannel: ChatChannel = 'global';

    // 展開Action
    private expandAction: (targetPanel: IChatPanelType, currentChannel: ChatChannel) => void = null;

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
        ChatManager.on('ON_MESSAGE_RECEIVED', this.showMessage, this);
        // 綁定:招募列表訊息接收
        ChatManager.on('ON_RECRUIT_LIST_RECEIVED', (datas: IChatMessageData[]) => {
            if(this.currentChannel === 'recruit') {
                this.showMessage(datas[datas.length - 1]);
            }  
        }, this);
    }
    
    protected start(): void {
        // 頻道切換按鈕
        this.btn_channel.node.on(Button.EventType.CLICK, () => {
            let channels: ChatChannel[] = [];
            switch(this.currentChatPlace) {
                case CHAT_PLACE.LobbyVIew:
                    channels = ['global', 'recruit'];
                    break;

                case CHAT_PLACE.RoomView:
                    channels = ['global', 'room'];
                    break;
            }

            const currentIndex = channels.indexOf(this.currentChannel);
            const nextIndex = (currentIndex + 1) % channels.length;
            this.SwitchChannel(channels[nextIndex]);
        }, this);

        // 展開按鈕
        this.btn_expand.node.on(Button.EventType.CLICK, () => {
            this.expandAction?.(IChatPanelType.Full, this.currentChannel);
        }, this);
    }

    public setData(chatPlace: CHAT_PLACE,
        expandAction: (targetPanel: IChatPanelType, currentChannel: ChatChannel) => void
    ) {
        this.currentChatPlace = chatPlace;
        this.expandAction = expandAction;

        // 獲取招募資料
        ChatManager.sendGetRecruitList();
    }

    /**
     * 面板開啟設定
     * @param targetChannel 
     */
    public openSet(targetChannel: ChatChannel) {
        this.SwitchChannel(targetChannel);

        // 獲取招募資料
        //ChatManager.sendGetRecruitList();
    }

    /**
     * 切換頻道
     * @param targetChannel 
     */
    private SwitchChannel(targetChannel: ChatChannel) {
        this.currentChannel = targetChannel;

        let datas = [];

        switch(targetChannel) {
            case 'global':
                this.label_currentChannel.string = '全頻';
                this.currentChannel = 'global';
                datas = ChatManager.getGlobaMessageData();
                break;

            case 'room':
                this.label_currentChannel.string = '房間';
                this.currentChannel = 'room';
                datas = ChatManager.getRoomMessageData();
                break;

            case 'recruit':
                this.label_currentChannel.string = '招募';
                this.currentChannel = 'recruit';
                datas = ChatManager.getRecruitData();
                break;
        }

        this.showMessage(datas[datas.length - 1]);
    }

    /**
     * 顯示訊息
     * @param data 
     * @returns 
     */
    private showMessage(data: IChatMessageData) {
        if (!data) {
            this.richText_message.string = '';
            return;
        }

        // 判斷頻道並處理裁切
        if (this.currentChannel === 'recruit' && data.recruitmentData) {
            const prefix = '<on click><color=#0fffff>房間招募:';
            const rawText = data.recruitmentData.roomName;
            const suffix = '</color></on>';
            
            this.setTruncatedRichText(prefix, rawText, suffix);
        } else {
            const prefix = '<color=#FFFFFF>';
            const rawText = data.type === 'sticker' ? '[貼圖]' : data.content || '';
            const suffix = '</color>';
            
            this.setTruncatedRichText(prefix, rawText, suffix);
        }
    }

    /**
     * 自動裁切RichText
     */
    private setTruncatedRichText(prefix: string, content: string, suffix: string) {
        // 最大允許寬度
        const maxAllowedWidth = 500; 
        // 將 RichText 的 maxWidth 設為 0，確保文字呈單行展開以利精確計算寬度
        this.richText_message.maxWidth = 0;
        // 完整文字
        this.richText_message.string = `${prefix}${content}${suffix}`;
        // 若超出指定寬度，逐字自尾端遞減並補上 '...'
        if (this.richTextTransform.width > maxAllowedWidth) {
            let charLength = content.length;
            
            while (charLength > 0 && this.richTextTransform.width > maxAllowedWidth) {
                charLength--;
                const truncatedText = content.substring(0, charLength) + '...';
                this.richText_message.string = `${prefix}${truncatedText}${suffix}`;
            }
        }
    }
}



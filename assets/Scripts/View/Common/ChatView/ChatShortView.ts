import { _decorator, Button, color, Color, Component, Label, Node, RichText, UITransform } from 'cc';
import { CHAT_PLACE, ChatChannel, ChatManager, IChatMessageData, IChatPanelType } from '../../../Manager/ChatManager';
import { SocketManager } from '../../../Network/SocketManager';
import { PlayerData } from '../../../Data/PlayerData';
import { RichTextClickHandler } from '../../../Tools/RichTextClickHandler';
import { DIFFICULTY_COLORS, DIFFICULTY_TYPE } from '../../../Data/RoomData';
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
    @property(RichTextClickHandler)
    private richTextClickHandler: RichTextClickHandler;
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
            this.richTextClickHandler.setContent('');
            return;
        }

        // 判斷頻道並處理裁切
        if (this.currentChannel === 'recruit' && data.recruitmentData) {
            // 困難度文字
            const difficultColor = DIFFICULTY_COLORS[data.recruitmentData.difficulty];
            const difficultString = `<color=${difficultColor}>[${data.recruitmentData.difficultyName}]</color>`;
            // 房間名稱文字
            const roomNameString = `<color=#FFFFFF> 房間: ${data.recruitmentData.roomName}</color>`
            // 邀請文字
            const inviteString = `<color=#E9E92D> 邀請!</color>`
            // 完整文字內容
            const fullString = `${difficultString}${roomNameString}${inviteString}`
            
            // 點擊文字
            const clickRoomNameString = `<color=#7C7C7C> 房間: ${data.recruitmentData.roomName}</color>`;
            // 滑入文字
            const enterRoomNameString = `<color=#D1D1D1> 房間: ${data.recruitmentData.roomName}</color>`;

            this.richTextClickHandler.setContent(fullString);
            this.richTextClickHandler.isCanClick = true;
            this.richTextClickHandler.clickString = `<on click>${difficultString}${clickRoomNameString}${inviteString}</on>`;
            this.richTextClickHandler.enterString = `<on click>${difficultString}${enterRoomNameString}${inviteString}</on>`;
            this.richTextClickHandler.clickAction = () => {
                SocketManager.getInstance().sendJoinRoom({
                    roomId: data.recruitmentData.roomId, 
                    characterId: PlayerData.characterId
                });
            }
        } else {
            const prefix = '<color=#FFFFFF>';
            const rawText = data.type === 'sticker' ? '[貼圖]' : data.content || '';
            const suffix = '</color>';
            
            const fullString = `${prefix}${rawText}${suffix}`;
            this.richTextClickHandler.setContent(fullString);
            this.richTextClickHandler.isCanClick = false;
        }
    }
}



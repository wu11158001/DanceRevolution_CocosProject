import { _decorator, Component, Label, Node, UITransform, v3, Vec2, Vec3, HorizontalTextAlignment, Sprite, Button } from 'cc';
import { SpriteFrameManager } from '../../../Manager/SpriteFrameManager';
import { IChatMessageData } from '../../../Manager/ChatManager';
import { PlayerData } from '../../../Data/PlayerData';
import { GameTool } from '../../../Tools/GameTool';
import { SocketManager } from '../../../Network/SocketManager';
import { ViewManager } from '../../../Manager/ViewManager';
import { RoomView } from '../../LobbyScene/RoomView/RoomView';
import { LobbyView } from '../../LobbyScene/LobbyView/LobbyView';
import { MessagePopupView } from '../MessagePopupView';
const { ccclass, property } = _decorator;

/**
 * 聊天內容項目
 */
@ccclass('ChatItemView')
export class ChatItemView extends Component {
    @property(UITransform)
    private mainTransform: UITransform = null;

    @property(Label)
    private label_nickname: Label = null;
    @property(UITransform)
    private nicknameTransform: UITransform = null;

    @property(UITransform)
    private messageNodeTransform: UITransform = null;
    @property(Label)
    private label_message: Label = null;
    @property(UITransform)
    private messageTransform: UITransform = null;

    @property(UITransform)
    private stickTransform: UITransform = null;
    @property(Sprite)
    private sprite_stick: Sprite = null;

    @property(Label)
    private label_time: Label = null;
    @property(UITransform)
    private timeTransform: UITransform = null;

    @property(Button)
    private btn_recruit: Button = null;
    @property(UITransform)
    private recruitTransform: UITransform = null;
    @property(Label)
    private label_recruitRoomName: Label = null;
    @property(Label)
    private label_recruitPlayerCount: Label = null;

    @property({ tooltip: "文字訊息最大寬度" })
    maxWidth: number = 530;
    @property({ tooltip: "文字訊息最小寬度" })
    minWidth: number = 100;
    @property({ tooltip: "背景寬度Padding" })
    bgWidthPadding: number = 15;
    @property({ tooltip: "背景高度Padding" })
    bgHeightPadding: number = 5;

    private isSelf: boolean = false;

    /**
     * 設置資料
     * @param data 
     * @returns 
     */
    public setData(data: IChatMessageData) {
        if(!data) {
            this.node.active = false;
            return;
        }

        this.isSelf = data.senderId === PlayerData.playerId;

        this.label_nickname.string = data.senderName;
        this.label_time.string = GameTool.getInstance().formatChatTimestamp(data.timestamp);

        this.setDirection();

        switch(data.type) {
            case 'text':
                this.showMessage(data.content);
                break;

            case 'sticker':
                this.showStick(data.content);
                break;

            case 'recruit':
                this.showRecrit(data);
                break;
        }
    }

    /**
     * 設置顯示方向
     */
    private setDirection() {
        const anchorPoint = this.isSelf ? new Vec2(1, 0.5) : new Vec2(0, 0.5);
        this.mainTransform.anchorPoint = anchorPoint;
        this.nicknameTransform.anchorPoint = anchorPoint;
        this.messageNodeTransform.anchorPoint = anchorPoint;
        this.messageTransform.anchorPoint = anchorPoint;
        this.stickTransform.anchorPoint = anchorPoint;
        this.timeTransform.anchorPoint = anchorPoint;
        this.recruitTransform.anchorPoint = anchorPoint;

        const horizontalAlign = this.isSelf ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.LEFT;
        this.label_nickname.horizontalAlign = horizontalAlign;
        this.label_message.horizontalAlign = horizontalAlign;
        this.label_time.horizontalAlign = horizontalAlign;

        this.label_nickname.node.position = new Vec3(0, this.label_nickname.node.position.y, 0);
    }

    /**
     * 顯示招募訊息
     */
    private showRecrit(data: IChatMessageData) {
        if(!data || !data.recruitmentData) {
            this.node.active = false;
            return;
        }

        this.messageNodeTransform.node.active = false;
        this.stickTransform.node.active = false;
        this.btn_recruit.node.active = true;

        this.label_recruitRoomName.string = data.recruitmentData.roomName;
        this.label_recruitPlayerCount.string = `人數: ${data.recruitmentData.currentPlayers} / ${data.recruitmentData.maxPlayers}`;

        this.btn_recruit.node.targetOff(this);
        this.btn_recruit.node.on(Button.EventType.CLICK, () => {
            SocketManager.getInstance().sendJoinRoom(
                { roomId: data.recruitmentData.roomId, characterId: PlayerData.characterId }, 
                (res: { success: boolean; message?: string }) => {
                    if (res && res.success) {
                        ViewManager.getInstance().openView<RoomView>('RoomView', 'HUD').then((roomView) => {
                        const lobbyView = ViewManager.getInstance().getView<LobbyView>('LobbyView');
                            if(lobbyView) {
                                lobbyView.closeSelf();
                            }
                        });
                    } else {
                        console.warn(`[快速加入失敗]: ${res?.message}`);
                        ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
                            popup?.setData(res?.message || "加入房間失敗!");
                        });
                    }
                }
            );
        }, this);
    }

    /**
     * 顯示貼圖
     */
    private showStick(stick: string) {
        this.messageNodeTransform.node.active = false;
        this.stickTransform.node.active = true;
        this.btn_recruit.node.active = false;

        const spriteFrame = SpriteFrameManager.getInstance().getStick(stick);
        if(spriteFrame) {
            this.sprite_stick.spriteFrame = spriteFrame;
        }
    }

    /**
     * 顯示文字訊息
     */
    private showMessage(message: string) {
        this.messageNodeTransform.node.active = true;
        this.stickTransform.node.active = false;
        this.btn_recruit.node.active = false;

        // 設為 NONE，計算單行自然寬度
        this.label_message.overflow = Label.Overflow.NONE;
        this.label_message.string = message;
        this.label_message.updateRenderData(true);
        
        // 判斷是否超過最大寬度限制
        if (this.messageTransform.width > this.maxWidth) {
            this.messageTransform.width = this.maxWidth;
            this.label_message.overflow = Label.Overflow.RESIZE_HEIGHT;
            
            // 強制更新，取得換行後的正確高度
            this.label_message.updateRenderData(true);
        }
        
        const offsetX = this.isSelf ? -this.bgWidthPadding : this.bgWidthPadding;
        this.label_message.node.position = new Vec3(offsetX, 0, 0);

        // 設置背景大小+Padding
        this.messageNodeTransform.setContentSize(
            this.messageTransform.width + (this.bgWidthPadding * 2),
            this.messageTransform.height + (this.bgHeightPadding * 2)
        )
    }
}



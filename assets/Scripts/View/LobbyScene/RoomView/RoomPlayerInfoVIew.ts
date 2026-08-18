import { _decorator, Button, Component, Label, Node, tween, Tween, Vec3, v3, UIOpacity } from 'cc';
import { PlayerData } from '../../../Data/PlayerData';
import { ChatManager, IChatMessageData } from '../../../Manager/ChatManager';
const { ccclass, property } = _decorator;

/**
 * 房間玩家訊息
 */
@ccclass('RoomPlayerInfoVIew')
export class RoomPlayerInfoVIew extends Component {
    @property(Node)
    private isHostNode: Node = null;
    @property(Label)
    private label_nickname: Label = null;
    @property(Node)
    private readyNode: Node = null;
    @property(Button)
    private btn_kick: Button = null;
    @property(Node)
    private selfNode: Node = null;
    @property(UIOpacity)
    private uiOpacity_talkNode: UIOpacity = null;

    private playerId: string = '';

    // 本地指標移動參數
    private selfNodeMoveDistance = 10; // 上下移動距離
    private selfNodeDuration = 1.0;    // 單程時間

    protected onDestroy(): void {
        ChatManager.targetOff(this);
    }

    protected start(): void {
        // 綁定:新聊天訊息接收
        ChatManager.on('ON_MESSAGE_RECEIVED', this.onReciveMessage, this);

        this.uiOpacity_talkNode.opacity = 0;
    }

    public setData(data:{playerId: string, isHost: boolean, nickname: string, isReady: boolean, kcikAction: () => void}) {
        this.playerId = data.playerId;

        // 本地玩家是否是房主
        const isLocalHost = PlayerData.isHost;
        const isLocal = data.playerId === PlayerData.playerId;

        Tween.stopAllByTarget(this.selfNode);

        this.selfNode.active = isLocal;
        this.isHostNode.active = data.isHost;
        this.label_nickname.string = data.nickname;
        this.readyNode.active = data.isReady && !data.isHost;

        this.btn_kick.node.off(Button.EventType.CLICK);
        
        if(isLocalHost && !data.isHost) {
            this.btn_kick.node.active = true;
            this.btn_kick.node.on(Button.EventType.CLICK, () => data.kcikAction?.() , this);
        } else {
            this.btn_kick.node.active = false;
        }

        // 本地玩家標籤
        if(isLocal) {
            this.selfNode.position = v3(0,25,0);

            tween(this.selfNode)
                .by(this.selfNodeDuration, { position: new Vec3(0, this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .by(this.selfNodeDuration, { position: new Vec3(0, -this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .union()          // 將上面的動作打包為一個整體單元
                .repeatForever()  // 無限循環
                .start();
        }
    }

    /**
     * 收到新訊息
     * @param data 
     */
    private onReciveMessage(data: IChatMessageData) {
        // 如果是房間訊息且是該玩家顯示說話Icon
        if(data.channel === 'room' && data.senderId === this.playerId ) {
            this.uiOpacity_talkNode.opacity = 0;

            tween(this.uiOpacity_talkNode)
                .to(0.35, {opacity: 255})
                .start();

            this.unschedule(this.closeTalkNode);
            this.scheduleOnce(this.closeTalkNode, 2)
        }
    }

    /**
     * 關閉說話Node
     */
    private closeTalkNode() {
        tween(this.uiOpacity_talkNode)
            .to(0.35, {opacity: 0})
            .start();
    }
}



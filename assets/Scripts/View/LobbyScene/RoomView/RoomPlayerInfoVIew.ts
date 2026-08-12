import { _decorator, Button, Component, Label, Node, tween, Tween, Vec3 } from 'cc';
import { PlayerData } from '../../../Data/PlayerData';
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

    // 本地指標移動參數
    private selfNodeMoveDistance = 20; // 上下移動距離
    private selfNodeDuration = 1.0;    // 單程時間

    public setData(data:{playerId: string, isHost: boolean, nickname: string, isReady: boolean, kcikAction: () => void}) {
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

        if(isLocal) {
            tween(this.selfNode)
                .by(this.selfNodeDuration, { position: new Vec3(0, this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .by(this.selfNodeDuration, { position: new Vec3(0, -this.selfNodeMoveDistance, 0) }, { easing: 'sineInOut' })
                .union()          // 將上面的動作打包為一個整體單元
                .repeatForever()  // 無限循環
                .start();
        }
    }
}



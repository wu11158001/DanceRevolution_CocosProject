import { _decorator, Button, Component, Label, Node } from 'cc';
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

    public setData(data:{isHost: boolean, nickname: string, isReady: boolean, kcikAction: () => void}) {
        // 本地玩家是否是房主
        const isLocalHost = PlayerData.isHost;

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
    }
}



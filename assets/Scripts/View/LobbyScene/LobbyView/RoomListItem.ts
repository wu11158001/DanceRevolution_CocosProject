import { _decorator, Button, Color, Component, Label, Node } from 'cc';
import { IRoomListData } from '../../../Data/RoomData';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
const { ccclass, property } = _decorator;

/**
 * 房間列表項目
 */
@ccclass('RoomListItem')
export class RoomListItem extends Component {
    @property(Button)
    private mainBtn: Button = null;
    @property(Label)
    private label_roomName: Label = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;
    @property(Label)
    private label_playerCount: Label = null;
    @property(Label)

    private label_playState: Label = null;
    @property(Color)
    private startingColor: Color = new Color(255,255,255,255);
    @property(Color)
    private waitingColor: Color = new Color(255,255,255,255);

    public setData(data: IRoomListData, callback?: () => void) {
        this.label_roomName.string = data.roomName;
        this.label_playerCount.string = `${data.currentPlayers} / ${data.maxPlayers}`;

        this.label_playState.string = data.isStarting ? "進行中" : "等待";
        this.label_playState.color = data.isStarting ? this.startingColor : this.waitingColor;

        this.mainBtn.interactable = !data.isStarting;
        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => callback?.(), this);

        this.fixedMarqueeText.setTitle(data.currentSong.name);
    }
}



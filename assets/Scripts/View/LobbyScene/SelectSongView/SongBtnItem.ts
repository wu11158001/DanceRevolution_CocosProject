import { _decorator, Button, Component, Label, Node } from 'cc';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
import { ISongData } from '../../../Data/RoomData';
import { GameTool } from '../../../Tools/GameTool';
const { ccclass, property } = _decorator;

/**
 * 歌曲列表按鈕項目
 */
@ccclass('SongBtnItem')
export class SongBtnItem extends Component {
    @property(Button)
    private mainBtn: Button = null;
    @property(Label)
    private label_author: Label = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;
    @property(Label)
    private label_bpm: Label = null;
    @property(Label)
    private label_songDuration: Label = null;

    public setData(data: ISongData, callback?: () => void) {
        const songParts = data.name.split('-');

        this.label_author.string = songParts[0];
        this.label_bpm.string = `BPM: ${data.bpm}`;
        this.fixedMarqueeText.setTitle(songParts[1]);
        this.label_songDuration.string = `TIME: ${GameTool.getInstance().formatTime(data.duration)}`

        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => { callback?.() }, this);
    }
}



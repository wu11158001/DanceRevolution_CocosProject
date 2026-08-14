import { _decorator, Button, Component, Label, Node } from 'cc';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
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

    public setData(songInfo: string, bpm: number, callback?: () => void) {
        const songParts = songInfo.split('-');

        this.label_author.string = songParts[0];
        this.label_bpm.string = `BPM: ${bpm}`;
        this.fixedMarqueeText.setTitle(songParts[1]);
        
        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => { callback?.() }, this);
    }
}



import { _decorator, Button, Component, Label, Node } from 'cc';
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
    @property(Label)
    private label_sonName: Label = null;
    @property(Label)
    private label_bpm: Label = null;

    public setData(songInfo: string, bpm: number, callback?: () => void) {
        const songParts = songInfo.split('-');

        this.label_author.string = songParts[0];
        this.label_sonName.string = songParts[1];
        this.label_bpm.string = `BPM: ${bpm}`;

        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => { callback?.() }, this);
    }
}



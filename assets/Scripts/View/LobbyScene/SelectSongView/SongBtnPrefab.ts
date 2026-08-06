import { _decorator, Button, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 歌曲列表按鈕
 */
@ccclass('songBtnPrefab')
export class SongBtnPrefab extends Component {
    @property(Button)
    private mainBtn: Button = null;
    @property(Label)
    private label_songInfo: Label = null;

    public setData(songInfo: string, callback?: () => void) {
        this.label_songInfo.string = songInfo;

        this.mainBtn.node.targetOff(this);
        this.mainBtn.node.on(Button.EventType.CLICK, () => { callback?.() }, this);
    }
}



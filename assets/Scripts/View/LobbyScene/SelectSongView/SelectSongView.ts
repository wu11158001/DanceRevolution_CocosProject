import { _decorator, Button, Component, instantiate, Label, Node, Toggle } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ISongData, RoomData } from 'db://assets/Scripts/Data/RoomData';
import { SongBtnItem } from './SongBtnItem';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
import { AudioManager } from 'db://assets/Scripts/Manager/AudioManager'; // 引用 AudioManager

const { ccclass, property } = _decorator;

export enum SortType {
    AUTHOR,
    BPM
}

/**
 * 歌曲列表
 */
@ccclass('SelectSongView')
export class SelectSongView extends BaseView {
    @property(Button)
    private btn_close: Button = null;

    @property(Toggle)
    private tog_aothorFilter: Toggle = null;
    @property(Toggle)
    private tog_bpmFilter: Toggle = null;

    @property(Node)
    private songBtnPrefab: Node = null;
    @property(Node)
    private songBtnParent: Node = null;

    @property(Node)
    private downNode: Node = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;
    @property(Button)
    private btn_confirm: Button = null;

    private currentSongData: ISongData = null;
    private currentSortType: SortType = SortType.AUTHOR; // 預設排序

    protected start(): void {
        // 關閉按鈕
        this.btn_close.node.on(Button.EventType.CLICK, () => {
            this.closeSelf();
        }, this);

        // 確認按鈕
        this.btn_confirm.node.on(Button.EventType.CLICK, () => { 
            if(!this.currentSongData) return;

            SocketManager.getInstance().sendSelectSong(this.currentSongData.id);
            this.closeSelf();
        }, this);

        // 作者篩選按鈕
        this.tog_aothorFilter.node.on('toggle', (toggle: Toggle) => {
            if (toggle.isChecked) {
                this.currentSortType = SortType.AUTHOR;
                this.refreshSongList();
            }
        }, this);

        // BMP篩選按鈕
        this.tog_bpmFilter.node.on('toggle', (toggle: Toggle) => {
            if (toggle.isChecked) {
                this.currentSortType = SortType.BPM;
                this.refreshSongList();
            }
        }, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.downNode.active = false;
        this.currentSongData = null;
        this.songBtnPrefab.active = false;

        this.refreshSongList();
    }

    /**
     * 關閉介面時的回調
     */
    public onClose() {
        AudioManager.getInstance().stopSongPreview(true);
        super.onClose();
    }

    /**
     * 刷新歌曲列表
     */
    private refreshSongList() {
        // 排序資料
        const sortedSongs = [...RoomData.songs];

        if (this.currentSortType === SortType.AUTHOR) {
            // 依作者/歌名 (Alphabetical) 排序
            sortedSongs.sort((a, b) => a.name.localeCompare(b.name));
        } else if (this.currentSortType === SortType.BPM) {
            sortedSongs.sort((a, b) => b.bpm - a.bpm);
        }

        // 重新生成按鈕
        sortedSongs.forEach((song) => {
            const songNode = instantiate(this.songBtnPrefab);
            songNode.active = true;
            songNode.setParent(this.songBtnParent);
            songNode.name = 'SongItem';

            const songBtnItem = songNode.getComponent(SongBtnItem);
            if (songBtnItem) {
                songBtnItem.setData(
                    song.name,
                    song.bpm,
                    () => {
                        // 點擊歌曲卡片
                        this.currentSongData = song;
                        this.downNode.active = true;
                        this.fixedMarqueeText.setTitle(`${song.name} (BPM:${song.bpm})`);

                        // 開始試聽
                        AudioManager.getInstance().playSongPreview(song);
                    }
                );
            }
        });
    }
}
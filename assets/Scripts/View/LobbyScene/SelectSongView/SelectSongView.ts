import { _decorator, Button, Component, instantiate, Label, Node, Toggle } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ISongData, RoomData } from 'db://assets/Scripts/Data/RoomData';
import { SongBtnItem } from './SongBtnItem';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
import { AudioManager } from 'db://assets/Scripts/Manager/AudioManager'; // 引用 AudioManager
import { GameTool } from '../../../Tools/GameTool';

const { ccclass, property } = _decorator;

export enum SortType {
    AUTHOR,
    BPM,
    TIME
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
    @property(Toggle)
    private tog_timeFilter: Toggle = null;

    @property(Node)
    private songBtnPrefab: Node = null;
    @property(Node)
    private songBtnParent: Node = null;

    @property(Node)
    private downNode: Node = null;
    @property(Label)
    private label_selectBPM: Label = null;
    @property(Label)
    private label_selectTime: Label = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;
    @property(Button)
    private btn_confirm: Button = null;

    private currentSongData: ISongData = null;
    private currentSortType: SortType = SortType.AUTHOR; // 預設排序
    private isFilterReverse: boolean = false;   // 排序(false=升幕, true=降幕)

    private songBtnItems: SongBtnItem[] = [];

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

        // 時間篩選按鈕
        this.tog_timeFilter.node.on('toggle', (toggle: Toggle) => {
            if (toggle.isChecked) {
                this.currentSortType = SortType.TIME;
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

        this.isFilterReverse = !this.isFilterReverse;

        switch(this.currentSortType) {
            case SortType.AUTHOR:
                // 依作者/歌名 排序
                if(this.isFilterReverse) {
                    sortedSongs.sort((a, b) => b.name.localeCompare(a.name));
                } else {
                    sortedSongs.sort((a, b) => a.name.localeCompare(b.name));
                }
                break;

            case SortType.BPM:
                // 依BPM排序
                if(this.isFilterReverse) {
                    sortedSongs.sort((a, b) => b.bpm - a.bpm);
                } else {
                    sortedSongs.sort((a, b) => a.bpm - b.bpm);
                }                
                break;

            case SortType.TIME:
                // 依歌曲時間排序
                if(this.isFilterReverse) {
                    sortedSongs.sort((a, b) => b.duration - a.duration);
                } else {
                    sortedSongs.sort((a, b) => a.duration - b.duration);
                }
                
                break;
        } 

        // 關閉當前所有項目
        this.songBtnItems.forEach((item) => {
            item.node.active = false;
        });

        // 重新生成項目按鈕
        let index: number = 0;
        sortedSongs.forEach((song) => {

            let songBtnItem: SongBtnItem = null;
            if(index < this.songBtnItems.length) {
                songBtnItem = this.songBtnItems[index];
            } else {
                const songNode = instantiate(this.songBtnPrefab);
                songNode.active = true;
                songNode.setParent(this.songBtnParent);

                songBtnItem = songNode.getComponent(SongBtnItem);
                if(songBtnItem) {
                    this.songBtnItems.push(songBtnItem);
                }
            }

            if (songBtnItem) {
                songBtnItem.node.active = true;
                songBtnItem.setData(
                    song,
                    () => {
                        // 點擊歌曲卡片
                        this.currentSongData = song;
                        this.downNode.active = true;
                        this.fixedMarqueeText.setTitle(`${song.name}`);
                        this.label_selectBPM.string = `BPM: ${song.bpm}`;
                        this.label_selectTime.string = `TIME: ${GameTool.getInstance().formatTime(song.duration)}`;

                        // 開始試聽
                        AudioManager.getInstance().playSongPreview(song);
                    }
                );
            }

            index++;
        });
    }
}
import { _decorator, Component, instantiate, Node } from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { RoomData } from 'db://assets/Scripts/Data/RoomData';
import { SongBtnPrefab } from './SongBtnPrefab';

const { ccclass, property } = _decorator;

/**
 * 歌曲列表
 */
@ccclass('SelectSongView')
export class SelectSongView extends BaseView {
    @property(Node)
    private songBtnPrefab: Node = null;
    @property(Node)
    private songBtnParent: Node = null;

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.createSongList();
    }

    /**
     * 創建歌曲列表
     */
    private createSongList() {
        const songsData = RoomData.songs;

        this.songBtnPrefab.active = false;
        songsData.forEach((song) => {
            const songNode = instantiate(this.songBtnPrefab);
            songNode.active = true;
            songNode.setParent(this.songBtnParent);

            const songBtnPrefab = songNode.getComponent(SongBtnPrefab)
            if(songBtnPrefab) {
                songBtnPrefab.setData(
                    `${song.name} (${song.bpm}BPM)`,
                    () => {
                        SocketManager.getInstance().sendSelectSong(song.id);
                        this.closeSelf();
                    }
                )
            }
        });

    }
}



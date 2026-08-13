import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { BGM_TYPE } from '../Manager/AudioManager';

// 房間內單一玩家的資料結構
export interface IRoomPlayer {
    playerId: string;
    nickname: string;
    slotId: number;         // 0~3 號位
    characterId: number;    // 角色編號
    isHost: boolean;
    isReady: boolean;
}

// 歌曲資料結構
export interface ISongData {
    id: keyof typeof BGM_TYPE;
    name: string,               // 歌曲明成
    bpm: number,                // BMP
    duration: number;           // 歌曲長度
    offset: number;             // 譜面開始時間
    preview_start: number;      // 試聽起點
    preview_duration: number;   // 試聽長度
}

// 房間資料更新資料結構
export interface IRoomUpdatedData {
    roomId: string;
    roomName: string;
    hostId: string;
    currentSong: ISongData;
    players: IRoomPlayer[];
}

// 創建房間回傳資料結構
export interface ICreateRoomResponse {
    success: boolean;
    roomId?: string;
    roomName?: string;
    slotId?: number;
    message?: string;
}

/**
 * 全域房間資靜態料庫
 */
export class RoomData {
    public static roomId: string = '';
    public static roomName: string = '';
    public static hostId: string = '';
    public static currentSong: ISongData = null;
    public static players: IRoomPlayer[] = [];
    public static songs: ISongData[] = [];

    // 儲存更新監聽事件
    public static onRoomUpdated: ((data: IRoomUpdatedData) => void) | null = null;

    /**
     * 更新歌單
     * @param res 後端傳回來的 Response 物件
     */
    public static updateSongs(res: { success: boolean; songs: Record<string, ISongData> }) {
        console.log(`更新歌單原始資料:`, res);
        if (res && res.songs) {
            this.songs = Object.keys(res.songs).map(key => res.songs[key]);
        } else {
            this.songs = [];
        }
    }

    /**
     * 更新房間資料並觸發監聽
     */
    public static update(data: IRoomUpdatedData) {
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.hostId = data.hostId;
        this.currentSong = data.currentSong;
        this.players = data.players;

        // 更新當前玩家在房間內的屬性 (同步至 PlayerData)
        const mySelf = data.players.find(p => p.playerId === PlayerData.playerId);
        if (mySelf) {
            PlayerData.roomId = data.roomId;
            PlayerData.isHost = mySelf.isHost;
            PlayerData.isReady = mySelf.isReady;
        }

        // 觸發刷新事件
        if (this.onRoomUpdated) {
            this.onRoomUpdated(data);
        }
    }

    /**
     * 清除房間資料 (離房/被踢時呼叫)
     */
    public static reset() {
        this.roomId = '';
        this.roomName = '';
        this.hostId = '';
        this.currentSong = null;
        this.players = [];
        PlayerData.roomId = '';
        PlayerData.isHost = false;
    }
}
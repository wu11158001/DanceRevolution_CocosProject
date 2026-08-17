import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { BGM_TYPE } from '../Manager/AudioManager';

/**
 * 困難度類型
 */
export enum DIFFICULTY_TYPE {
    EASY,
    NORMAL,
    HARD,
    CRAZY
}

// 房間內單一玩家資料
export interface IRoomPlayer {
    playerId: string;
    nickname: string;
    slotId: number;         // 0~3 號位
    characterId: number;    // 角色編號
    isHost: boolean;
    isReady: boolean;
}

// 歌曲資料
export interface ISongData {
    id: keyof typeof BGM_TYPE;
    name: string,               // 歌曲明成
    bpm: number,                // BMP
    duration: number;           // 歌曲長度
    offset: number;             // 譜面開始時間
    preview_start: number;      // 試聽起點
    preview_duration: number;   // 試聽長度
}

// 房間資料
export interface IRoomData {
    roomId: string;
    roomName: string;
    hostId: string;
    difficulty: DIFFICULTY_TYPE;
    difficultyName: string;
    currentSong: ISongData;
    players: IRoomPlayer[];
}

// 創建房間回傳資料
export interface ICreateRoomResponse {
    success: boolean;
    roomId?: string;
    roomName?: string;
    slotId?: number;
    message?: string;
}

// 房間列表歌曲資料
export interface IRoomListSongData {
    id: string;
    name: string;
}

// 房間列表資料
export interface IRoomListData {
    roomId: string;
    roomName: string;
    hostName: string;
    currentSong: IRoomListSongData;
    currentPlayers: number;
    maxPlayers: number;
    isStarting: boolean;
}

/**
 * 全域房間資靜態料庫
 */
export class RoomData {
    public static roomId: string = '';
    public static roomName: string = '';
    public static hostId: string = '';
    public static difficulty: DIFFICULTY_TYPE = DIFFICULTY_TYPE.EASY;
    public static difficultyName: string;
    public static currentSong: ISongData = null;
    public static players: IRoomPlayer[] = [];
    public static songs: ISongData[] = [];

    // 儲存更新監聽事件
    public static onRoomUpdated: ((data: IRoomData) => void) | null = null;

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
    public static update(data: IRoomData) {
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.hostId = data.hostId;
        this.difficultyName = data.difficultyName;
        this.currentSong = data.currentSong;
        this.players = data.players;

        if (typeof data.difficulty === 'string') {
            // 若後端給字串 'EASY'，轉成 Enum 數字 0 存入 static 變數
            this.difficulty = DIFFICULTY_TYPE[data.difficulty as keyof typeof DIFFICULTY_TYPE] ?? DIFFICULTY_TYPE.EASY;
        } else {
            this.difficulty = data.difficulty ?? DIFFICULTY_TYPE.EASY;
        }


        // 更新當前玩家在房間內的屬性 (同步至 PlayerData)
        const mySelf = data.players.find(p => p.playerId === PlayerData.playerId);
        if (mySelf) {
            PlayerData.roomId = data.roomId;
            PlayerData.isHost = mySelf.isHost;
            PlayerData.isReady = mySelf.isReady;
        }

        // 觸發刷新事件
        if (this.onRoomUpdated) {
            this.onRoomUpdated(this);
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
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';

/**
 * 遊戲難度類型枚舉
 */
export enum DIFFICULTY_TYPE {
    EASY = "EASY",      // 簡單模式
    NORMAL = "NORMAL",  // 普通模式
    HARD = "HARD",      // 困難模式
    CRAZY = "CRAZY"     // 瘋狂模式
}

/**
 * 難度對應的顏色映射表
 */
export const DIFFICULTY_COLORS: Record<DIFFICULTY_TYPE, string> = {
    [DIFFICULTY_TYPE.EASY]: '#FFFFFF',    // 白色 - 簡單
    [DIFFICULTY_TYPE.NORMAL]: '#44FF20',  // 綠色 - 普通
    [DIFFICULTY_TYPE.HARD]: '#FFC920',    // 橙色 - 困難
    [DIFFICULTY_TYPE.CRAZY]: '#FF33FF',   // 粉紅色 - 瘋狂
};

/**
 * 房間內單一玩家的資料結構
 */
export interface IRoomPlayer {
    playerId: string;       // 玩家唯一識別碼
    nickname: string;       // 玩家暱稱
    slotId: number;         // 玩家位置編號（0~3）
    characterId: number;    // 選擇的角色編號
    isHost: boolean;        // 是否為房主
    isReady: boolean;       // 是否已準備
}

/**
 * 歌曲資料結構
 */
export interface ISongData {
    id: string;                // 歌曲唯一識別碼
    name: string;              // 歌曲名稱
    bpm: number;               // 每分鐘節拍數（Beats Per Minute）
    duration: number;          // 歌曲總長度（秒）
    offset: number;            // 譜面開始時間偏移（秒）
    preview_start: number;     // 試聽起始時間點（秒）
    preview_duration: number;  // 試聽片段長度（秒）
}

/**
 * 房間完整資料結構
 */
export interface IRoomData {
    roomId: string;               // 房間唯一識別碼
    roomName: string;             // 房間名稱
    hostId: string;               // 房主的玩家 ID
    difficulty: DIFFICULTY_TYPE;  // 當前難度
    difficultyName: string;       // 難度顯示名稱（本地化）
    currentSong: ISongData;       // 當前選擇的歌曲
    players: IRoomPlayer[];       // 房間內的所有玩家列表
}

/**
 * 創建房間的回應資料結構
 */
export interface ICreateRoomResponse {
    success: boolean;     // 是否成功創建
    roomId?: string;      // 房間 ID（成功時返回）
    roomName?: string;    // 房間名稱（成功時返回）
    slotId?: number;      // 分配給創建者的位置（成功時返回）
    message?: string;     // 錯誤訊息（失敗時返回）
}

/**
 * 房間列表中的歌曲簡化資料
 */
export interface IRoomListSongData {
    id: string;      // 歌曲 ID
    name: string;    // 歌曲名稱
}

/**
 * 房間列表項目資料結構
 */
export interface IRoomListData {
    roomId: string;                   // 房間 ID
    roomName: string;                 // 房間名稱
    hostName: string;                 // 房主名稱
    difficulty: DIFFICULTY_TYPE;      // 難度
    difficultyName: string;           // 難度顯示名稱
    currentSong: IRoomListSongData;   // 當前歌曲（簡化版）
    currentPlayers: number;           // 當前玩家數
    maxPlayers: number;               // 最大玩家數
    isStarting: boolean;              // 是否正在開始遊戲
}

/**
 * 全域房間靜態資料庫
 */
export class RoomData {    
    /** 房間唯一識別碼 */
    public static roomId: string = '';
    
    /** 房間名稱 */
    public static roomName: string = '';
    
    /** 房主玩家 ID */
    public static hostId: string = '';
    
    /** 當前難度設定 */
    public static difficulty: DIFFICULTY_TYPE = DIFFICULTY_TYPE.EASY;
    
    /** 難度顯示名稱） */
    public static difficultyName: string = '';
    
    /** 當前選擇的歌曲資料 */
    public static currentSong: ISongData | null = null;
    
    /** 房間內的所有玩家列表 */
    public static players: IRoomPlayer[] = [];
    
    /** 可選擇的歌曲列表 */
    public static songs: ISongData[] = [];
    
    /**
     * 房間資料更新時的回調函數
     */
    public static onRoomUpdated: ((data: IRoomData) => void) | null = null;

    /**
     * 更新歌曲列表
     * @param res 後端回傳的歌曲資料
     */
    public static updateSongs(res: { success: boolean; songs: Record<string, ISongData> }): void {
        // 資料驗證失敗時直接清空並返回
        if (!res || !res.songs) {
            this.songs = [];
            return;
        }
        
        // 將物件格式轉換為陣列格式
        this.songs = Object.values(res.songs);
    }

    /**
     * 更新房間完整資料
     * @param data 房間最新的完整資料
     */
    public static update(data: IRoomData): void {
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.hostId = data.hostId;
        this.difficulty = data.difficulty;
        this.difficultyName = data.difficultyName;
        this.currentSong = data.currentSong;
        this.players = data.players;

        // 同步本地玩家資料到 PlayerData
        const mySelf = data.players.find(p => p.playerId === PlayerData.playerId);
        
        if (mySelf) {
            // 更新玩家屬性
            PlayerData.roomId = data.roomId;
            PlayerData.isHost = mySelf.isHost;
            PlayerData.isReady = mySelf.isReady;
        }

        // 觸發房間更新回調
        if (this.onRoomUpdated) {
            this.onRoomUpdated(data);
        }
    }

    /**
     * 清除房間資料
     */
    public static reset(): void {
        this.roomId = '';
        this.roomName = '';
        this.hostId = '';
        this.currentSong = null;
        this.players.length = 0;
        
        // 同步清空 PlayerData 中的房間相關資訊
        PlayerData.roomId = '';
        PlayerData.isHost = false;
    }
}
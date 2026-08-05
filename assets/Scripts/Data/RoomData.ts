import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';

// 房間內單一玩家的資料結構
export interface IRoomPlayer {
    playerId: string;
    nickname: string;
    slotId: number;         // 0~3 號位
    characterId: number;    // 角色編號
    isHost: boolean;
    isReady: boolean;
}

// 房間資料更新資料結構
export interface IRoomUpdatedData {
    roomId: string;
    roomName: string;
    hostId: string;
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
    public static players: IRoomPlayer[] = [];

    // 儲存更新監聽事件
    public static onRoomUpdated: ((data: IRoomUpdatedData) => void) | null = null;

    /**
     * 更新房間資料並觸發監聽
     */
    public static update(data: IRoomUpdatedData) {
        this.roomId = data.roomId;
        this.roomName = data.roomName;
        this.hostId = data.hostId;
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
        this.players = [];
        PlayerData.roomId = '';
        PlayerData.isHost = false;
    }
}
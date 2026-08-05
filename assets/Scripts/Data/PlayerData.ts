import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';

export type PlayerDataMap = {
    playerId: string;
    nickname: string;
    roomId: string;
    isHost: boolean;
    isReady: boolean;
    characterId: number;
};

export type PlayerDataKey = keyof PlayerDataMap;

/**
 * 全域玩家靜態資料庫
 */
export class PlayerData {
    private static _data: PlayerDataMap = {
        playerId: '',
        nickname: '',
        roomId: '',
        isHost: false,
        isReady: false,
        characterId: 0
    };

    // 使用交叉型別/函數型別讓 listeners 支援更精確的定義
    private static listeners: Map<PlayerDataKey, Set<{ callback: Function; target?: any }>> = new Map();

    public static get playerId(): string { return this._data.playerId; }
    public static set playerId(val: string) { this.setValue('playerId', val); }

    public static get nickname(): string { return this._data.nickname; }
    public static set nickname(val: string) { this.setValue('nickname', val); }

    public static get roomId(): string { return this._data.roomId; }
    public static set roomId(val: string) { this.setValue('roomId', val); }

    public static get isHost(): boolean { return this._data.isHost; }
    public static set isHost(val: boolean) { this.setValue('isHost', val); }

    public static get isReady(): boolean { return this._data.isReady; }
    public static set isReady(val: boolean) { this.setValue('isReady', val); }

    public static get characterId(): number { return this._data.characterId; }
    public static set characterId(val: number) { 
        this.setValue('characterId', val);
        SocketManager.getInstance().sendChangeCharacter(val);
    }

    private static setValue<K extends PlayerDataKey>(key: K, val: PlayerDataMap[K]) {
        if (this._data[key] === val) return;
        this._data[key] = val;
        this.emit(key, val);
    }

    /**
     * 訂閱指定資料變更
     */
    public static on<K extends PlayerDataKey>(
        key: K, 
        callback: (newValue: PlayerDataMap[K]) => void, 
        target?: any
    ) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key)!.add({ callback, target });
    }

    /**
     * 取消訂閱指定資料變更
     */
    public static off<K extends PlayerDataKey>(
        key: K, 
        callback: (newValue: PlayerDataMap[K]) => void, 
        target?: any
    ) {
        const set = this.listeners.get(key);
        if (!set) return;

        for (const item of set) {
            if (item.callback === callback && item.target === target) {
                set.delete(item);
                break;
            }
        }
    }

    /**
     * 派發變更通知
     */
    private static emit<K extends PlayerDataKey>(key: K, newValue: PlayerDataMap[K]) {
        const set = this.listeners.get(key);
        if (set) {
            set.forEach(item => {
                if (item.target) {
                    item.callback.call(item.target, newValue);
                } else {
                    item.callback(newValue);
                }
            });
        }
    }

    public static reset() {
        this.playerId = '';
        this.nickname = '';
        this.roomId = '';
        this.isHost = false;
        this.isReady = false;
        this.characterId = 0;
    }
}
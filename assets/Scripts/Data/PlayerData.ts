import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { director } from 'cc';

/**
 * 玩家資料結構映射表
 */
export type PlayerDataMap = {
    playerId: string;       // 玩家唯一識別碼
    nickname: string;       // 玩家暱稱
    roomId: string;         // 所在房間 ID
    isHost: boolean;        // 是否為房主
    isReady: boolean;       // 是否已準備
    characterId: number;    // 當前選擇的角色 ID
};

/**
 * PlayerDataMap 的所有鍵值類型
 */
export type PlayerDataKey = keyof PlayerDataMap;

/**
 * 監聽器項目結構
 */
interface ListenerItem {
    callback: Function;     // 回調函數
    target?: any;          // 綁定的目標物件（用於 call 時的 this 指向）
}

/**
 * 全域玩家靜態資料庫
 */
export class PlayerData {
    /**
     * 玩家資料儲存物件
     */
    private static _data: PlayerDataMap = {
        playerId: '',
        nickname: '',
        roomId: '',
        isHost: false,
        isReady: false,
        characterId: 0
    };

    /**
     * 事件監聽器映射表
     */
    private static listeners: Map<PlayerDataKey, Set<ListenerItem>> = new Map();

    /** 玩家 ID 存取器 */
    public static get playerId(): string { return this._data.playerId; }
    public static set playerId(val: string) { this.setValue('playerId', val); }

    /** 玩家暱稱存取器 */
    public static get nickname(): string { return this._data.nickname; }
    public static set nickname(val: string) { this.setValue('nickname', val); }

    /** 房間 ID 存取器 */
    public static get roomId(): string { return this._data.roomId; }
    public static set roomId(val: string) { this.setValue('roomId', val); }

    /** 房主狀態存取器 */
    public static get isHost(): boolean { return this._data.isHost; }
    public static set isHost(val: boolean) { this.setValue('isHost', val); }

    /** 準備狀態存取器 */
    public static get isReady(): boolean { return this._data.isReady; }
    public static set isReady(val: boolean) { this.setValue('isReady', val); }

    /** 
     * 角色 ID 存取器
     * 特別處理：設定時會額外觸發全域角色變更事件
     */
    public static get characterId(): number { return this._data.characterId; }
    public static set characterId(val: number) { 
        this.setValue('characterId', val);
        // 通知全域事件系統角色已變更
        director.emit('REQ_CHARACTER_CHANGE', Number(val));
    }

    /**
     * 設定資料值的內部方法
     * @param key 要設定的屬性鍵
     * @param val 新的屬性值
     */
    private static setValue<K extends PlayerDataKey>(key: K, val: PlayerDataMap[K]): void {
        // 值未變更時直接返回
        if (this._data[key] === val) return;
        
        // 更新資料
        this._data[key] = val;
        
        // 派發變更事件給所有訂閱者
        this.emit(key, val);
    }

    /**
     * 訂閱指定資料變更事件
     * @param key 要監聽的屬性鍵
     * @param callback 資料變更時的回調函數
     * @param target 回調函數綁定的目標物件（可選）
     */
    public static on<K extends PlayerDataKey>(
        key: K, 
        callback: (newValue: PlayerDataMap[K]) => void, 
        target?: any
    ): void {
        // 若該屬性尚無監聽器集合，則建立新的 Set
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        // 將監聽器加入集合
        this.listeners.get(key)!.add({ callback, target });
    }

    /**
     * 取消訂閱指定資料變更事件
     * @param key 要取消監聽的屬性鍵
     * @param callback 要移除的回調函數
     * @param target 回調函數綁定的目標物件（可選）
     */
    public static off<K extends PlayerDataKey>(
        key: K, 
        callback: (newValue: PlayerDataMap[K]) => void, 
        target?: any
    ): void {
        const set = this.listeners.get(key);
        
        // 若無監聽器則直接返回
        if (!set) return;

        // 遍歷監聽器集合，找到匹配的項目後刪除
        for (const item of set) {
            if (item.callback === callback && item.target === target) {
                set.delete(item);
                break;
            }
        }
    }

    /**
     * 派發資料變更事件給所有訂閱者
     * @param key 變更的屬性鍵
     * @param newValue 新的屬性值
     */
    private static emit<K extends PlayerDataKey>(key: K, newValue: PlayerDataMap[K]): void {
        const set = this.listeners.get(key);
        
        // 若該屬性無監聽器，則直接返回
        if (!set || set.size === 0) return;
        
        // 建立快照陣列，防止回調中修改監聽器集合
        const items = Array.from(set);
        
        // 遍歷所有監聽器並執行回調
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.target) {
                // 有綁定目標時，使用 call 確保 this 指向正確
                item.callback.call(item.target, newValue);
            } else {
                // 無綁定目標時，直接呼叫函數
                item.callback(newValue);
            }
        }
    }

    /**
     * 切換角色（循環切換）
     * @param switchIndex 切換方向（1=下一個，-1=上一個）
     */
    public static switchCharacterId(switchIndex: number): void {
        // 讀取當前角色 ID
        let currentIndex = this.characterId;
        currentIndex += switchIndex;

        // 快取角色總數，避免重複呼叫
        const maxIndex = CharacterDataManager.getInstance().characterCount - 1;
        
        // 處理邊界條件：實現循環切換
        if (currentIndex < 0) {
            currentIndex = maxIndex;
        } else if (currentIndex > maxIndex) {
            currentIndex = 0;
        }

        // 更新角色 ID（會自動觸發事件）
        this.characterId = currentIndex;
    }

    /**
     * 重置所有玩家資料為初始值
     */
    public static reset(): void {
        this._data.playerId = '';
        this._data.nickname = '';
        this._data.roomId = '';
        this._data.isHost = false;
        this._data.isReady = false;
        this._data.characterId = 0;
    }
}
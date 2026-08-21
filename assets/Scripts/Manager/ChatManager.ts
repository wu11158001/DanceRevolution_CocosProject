import { _decorator } from 'cc';
import { SocketManager } from '../Network/SocketManager';
import { DIFFICULTY_TYPE } from '../Data/RoomData';

const { ccclass } = _decorator;

/**
 * 聊天區域枚舉
 */
export enum CHAT_PLACE {
    LobbyVIew,  // 大廳場景
    RoomView    // 房間場景
}

/**
 * 聊天面板類型枚舉
 */
export enum IChatPanelType { 
    Full,   // 完整面板
    Short   // 簡短面板
}

/**
 * 聊天頻道類型
 */
export type ChatChannel = 'global' | 'room' | 'recruit';

/**
 * 聊天內容類型
 */
export type ChatType = 'text' | 'sticker' | 'recruit';

/**
 * 招募資料結構
 */
export interface IRecruitmentData {
    roomId: string;              // 房間 ID
    roomName: string;            // 房間名稱
    difficulty: DIFFICULTY_TYPE; // 難度
    difficultyName: string;      // 難度顯示名稱
    currentPlayers: number;      // 當前玩家數
    maxPlayers: number;          // 最大玩家數
}

/**
 * 聊天訊息資料結構
 */
export interface IChatMessageData {
    senderId: string;                      // 發送者 ID
    senderName: string;                    // 發送者暱稱
    channel: ChatChannel;                  // 頻道類型
    type: ChatType;                        // 內容類型
    content: string;                       // 訊息內容
    recruitmentData: IRecruitmentData;     // 招募資料（僅 type='recruit' 時有效）
    timestamp: number;                     // 時間戳記
}

/**
 * 聊天事件與資料映射表
 */
export type ChatEventMap = {
    /** 新訊息接收事件 */
    ON_MESSAGE_RECEIVED: IChatMessageData;
    /** 招募列表接收事件 */
    ON_RECRUIT_LIST_RECEIVED: IChatMessageData[];
};

/**
 * 聊天事件鍵類型
 */
export type ChatEventKey = keyof ChatEventMap;

/**
 * 監聽器項目結構
 */
interface ListenerItem {
    callback: Function;
    target?: any;
}

/**
 * 全域聊天管理器（靜態類別）
 */
@ccclass('ChatManager')
export class ChatManager {
    // ==================== 事件系統 ====================

    /**
     * 事件訂閱清單
     */
    private static listeners: Map<ChatEventKey, Set<ListenerItem>> = new Map();

    /**
     * 全域頻道訊息歷史
     */
    private static globalMessages: IChatMessageData[] = [];
    
    /**
     * 房間頻道訊息歷史
     */
    private static roomMessages: IChatMessageData[] = [];
    
    /**
     * 招募訊息列表
     */
    private static recruitMessage: IChatMessageData[] = [];

    /**
     * 最大歷史記錄數量
     */
    private static readonly MAX_HISTORY = 100;

    /**
     * 初始化
     */
    public static init(): void {
        const socket = SocketManager.getInstance().socket;
        if (!socket) {
            console.warn('[ChatManager] Socket 未初始化，無法註冊聊天事件');
            return;
        }

        // 移除舊的事件監聽器
        socket.off('chat_message_received');

        /**
         * 監聽：聊天訊息接收事件
         */
        socket.on('chat_message_received', (data: IChatMessageData) => {
            switch (data.channel) {
                case 'global':
                    // 全域訊息
                    this.globalMessages.push(data);
                    
                    // 超過最大記錄數時，移除最舊的訊息
                    if (this.globalMessages.length > this.MAX_HISTORY) {
                        this.globalMessages.shift();
                    }
                    break

                case 'room':
                    // 房間訊息
                    this.roomMessages.push(data);
                    
                    // 超過最大記錄數時，移除最舊的訊息
                    if (this.roomMessages.length > this.MAX_HISTORY) {
                        this.roomMessages.shift();
                    }
                    break;
            }

            // 派發訊息接收事件
            this.emit('ON_MESSAGE_RECEIVED', data);
        });

        /**
         * 監聽：招募列表更新事件
         */
        socket.on('recruitment_list_updated', this.updateRecruitListData.bind(this));
    }

    /**
     * 發送招募訊息
     * @param callback 伺服器回應的回調函數
     */
    public static sendRoomRecruit(callback?: (res: any) => void): void {
        SocketManager.getInstance().socket.emit('send_recruitment', callback);
    }

    /**
     * 請求獲取招募列表
     */
    public static sendGetRecruitList(): void {
        SocketManager.getInstance().socket.emit('get_recruitment_list', this.updateRecruitListData.bind(this));
    }

    /**
     * 發送聊天訊息（文字/貼圖）
     * @param data 訊息資料（頻道、類型、內容）
     * @param callback 伺服器回應的回調函數
     */
    public static sendChatMessage(
        data: { channel: ChatChannel; type: ChatType; content: string }, 
        callback?: (response: any) => void
    ): void {
        SocketManager.getInstance().socket?.emit('send_chat_message', data, (res: { success: boolean; message: string }) => {
            if (callback) callback(res);
        });
    }

    /**
     * 獲取全域頻道訊息歷史
     * @returns 全域訊息陣列
     */
    public static getGlobaMessageData(): IChatMessageData[] {
        return this.globalMessages;
    }

    /**
     * 獲取房間頻道訊息歷史
     * @returns 房間訊息陣列
     */
    public static getRoomMessageData(): IChatMessageData[] {
        return this.roomMessages;
    }

    /**
     * 獲取招募訊息列表
     * @returns 招募訊息陣列
     */
    public static getRecruitData(): IChatMessageData[] {
        return this.recruitMessage;
    }

    /**
     * 清除房間聊天歷史記錄
     */
    public static clearRoomMessageData(): void {
        this.roomMessages.length = 0;
    }

    /**
     * 更新招募列表資料
     * @param datas 招募訊息陣列
     */
    private static updateRecruitListData(datas: IChatMessageData[]): void {
        // 資料驗證與處理
        if (!datas || !Array.isArray(datas) || datas.length === 0) {
            // 清空招募列表
            this.recruitMessage.length = 0;
        } else {
            // 更新招募列表
            this.recruitMessage = datas;
        }
        
        // 派發招募列表更新事件
        this.emit('ON_RECRUIT_LIST_RECEIVED', datas);
    }

    /**
     * 訂閱聊天事件
     * @param event 事件名稱
     * @param callback 事件回調函數
     * @param target 回調綁定的目標物件（可選）
     */
    public static on<K extends ChatEventKey>(
        event: K,
        callback: (data: ChatEventMap[K]) => void,
        target?: any
    ): void {
        // 若該事件尚無監聽器集合，則建立新的 Set
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        // 將監聽器加入集合
        this.listeners.get(event)!.add({ callback, target });
    }

    /**
     * 取消訂閱聊天事件
     * @param event 事件名稱
     * @param callback 要移除的回調函數
     * @param target 回調綁定的目標物件（可選）
     */
    public static off<K extends ChatEventKey>(
        event: K,
        callback: (data: ChatEventMap[K]) => void,
        target?: any
    ): void {
        const set = this.listeners.get(event);
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
     * 移除特定目標的所有聊天事件監聽器
     * @param target 要移除的目標物件
     */
    public static targetOff(target: any): void {
        if (!target) return;
        
        // 遍歷所有事件的監聽器集合
        this.listeners.forEach((set) => {
            const items = Array.from(set);
            items.forEach((item) => {
                if (item.target === target) {
                    set.delete(item);
                }
            });
        });
    }

    /**
     * 派發聊天事件
     * @param event 事件名稱
     * @param data 事件資料
     */
    private static emit<K extends ChatEventKey>(event: K, data: ChatEventMap[K]): void {
        const set = this.listeners.get(event);
        
        // 無監聽器時直接返回
        if (!set || set.size === 0) return;
        
        // 建立快照陣列，防止回調中修改監聽器集合
        const items = Array.from(set);
        
        // 遍歷所有監聽器並執行回調
        items.forEach((item) => {
            if (item.target) {
                // 有綁定目標時，使用 call 確保 this 指向正確
                item.callback.call(item.target, data);
            } else {
                // 無綁定目標時，直接呼叫函數
                item.callback(data);
            }
        });
    }
}
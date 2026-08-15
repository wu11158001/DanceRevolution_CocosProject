import { _decorator } from 'cc';
import { SocketManager } from '../Network/SocketManager';

const { ccclass } = _decorator;

/**
 * 聊天區域
 */
export enum CHAT_PLACE {
    LobbyVIew,
    RoomView
}

/**
 * 聊天面板類型
 */
export enum IChatPanelType { Full, Short }

/**
 * 聊天頻道
 */
export type ChatChannel = 'global' | 'room' | 'recruit';

/**
 * 聊天內容類型
 */
export type ChatType = 'text' | 'sticker' | 'recruit';

/**
 * 招募資料
 */
export interface IRecruitmentData {
    roomId: string;
    roomName: string;
    currentPlayers: number;
    maxPlayers: number;
}

/**
 * 聊天訊息資料
 */
export interface IChatMessageData {
    senderId: string;
    senderName: string;
    channel: ChatChannel;
    type: ChatType;
    content: string;
    recruitmentData: IRecruitmentData;
    timestamp: number;
}

/**
 * 聊天事件對應的資料結構映射表
 */
export type ChatEventMap = {
    /** 新訊息接收事件 */
    ON_MESSAGE_RECEIVED: IChatMessageData;
    /** 招募列表接收事件 */
    ON_RECRUIT_LIST_RECEIVED: IChatMessageData[];
};

export type ChatEventKey = keyof ChatEventMap;

/**
 * 全域聊天資料與事件監聽器 (靜態類別)
 */
@ccclass('ChatManager')
export class ChatManager{

    /** 事件訂閱清單 */
    private static listeners: Map<ChatEventKey, Set<{ callback: Function; target?: any }>> = new Map();

    // 紀錄全頻訊息
    private static globalMessages: IChatMessageData[] = [];
    // 紀錄房間訊息
    private static roomMessages: IChatMessageData[] = [];
    // 紀錄招募訊息
    private static recruitMessage: IChatMessageData[] = [];


    // 最大紀錄訊息數量
    private static MAX_HISTORY = 100;

    /**
     * 初始化
     */
    public static init(): void {
        const socket = SocketManager.getInstance().socket;
        if (!socket) return;

        socket.off('chat_message_received');

        // 監聽: "chat_message_received" [聊天訊息]
        socket.on('chat_message_received', (data: IChatMessageData) => {
            switch (data.channel) {
            case 'global':
                this.globalMessages.push(data);
                if (this.globalMessages.length > this.MAX_HISTORY) {
                    this.globalMessages.shift(); // 移除最舊的一條
                }
                break;

            case 'room':
                this.roomMessages.push(data);
                if (this.roomMessages.length > this.MAX_HISTORY) {
                    this.roomMessages.shift();
                }
                break;
        }

            this.emit('ON_MESSAGE_RECEIVED', data);
        });

        // 監聽:招募清單更新
        SocketManager.getInstance().socket.on('recruitment_list_updated', this.updateRecruitListData.bind(this));
    }

    /**
     * 發送:招募訊息
     * @param callback 
     */
    public static sendRoomRecruit(callback?: (res: any) => void) {
        SocketManager.getInstance().socket.emit('send_recruitment', callback);
    }

    /**
     * 發送:獲取招募列表
     * @param callback 
     */
    public static sendGetRecruitList() {
        SocketManager.getInstance().socket.emit('get_recruitment_list', this.updateRecruitListData.bind(this));
    }

    /**
     * 更新招募列表資料
     * @param datas 
     */
    private static updateRecruitListData(datas: IChatMessageData[]) {
        if (!datas || !Array.isArray(datas) || datas.length === 0) {
            this.recruitMessage.length = 0;
        } else {
            this.recruitMessage = datas;
        }
        console.log(`更新招募列表資料:${JSON.stringify(datas)}`);
        this.emit('ON_RECRUIT_LIST_RECEIVED', datas)
    }

    /**
     * 發送聊天訊息 (文字/貼圖)
     */
    public static sendChatMessage(
        data: { channel: ChatChannel; type: ChatType; content: string }, 
        callback?: (response: any) => void
    ) {
        SocketManager.getInstance().socket?.emit('send_chat_message', data, (res: { success: boolean; message: string }) => {
            if (callback) callback(res);
        });
    }

    /**
     * 獲取全頻訊息資料
     * @returns 
     */
    public static getGlobaMessageData(): IChatMessageData[] {
        return this.globalMessages;
    }

    /**
     * 獲取房間訊息資料
     * @returns 
     */
    public static getRoomMessageData(): IChatMessageData[] {
        return this.roomMessages;
    }

    /**
     * 獲取招募資料
     */
    public static getRecruitData(): IChatMessageData[] {
        return this.recruitMessage;
    }

    /**
     * 清除房間聊天資料
     */
    public static clearRoomMessageData() {
        this.roomMessages.length = 0;
    }

    /**
     * 訂閱聊天事件
     */
    public static on<K extends ChatEventKey>(
        event: K,
        callback: (data: ChatEventMap[K]) => void,
        target?: any
    ) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add({ callback, target });
    }

    /**
     * 取消訂閱聊天事件
     */
    public static off<K extends ChatEventKey>(
        event: K,
        callback: (data: ChatEventMap[K]) => void,
        target?: any
    ) {
        const set = this.listeners.get(event);
        if (!set) return;

        for (const item of set) {
            if (item.callback === callback && item.target === target) {
                set.delete(item);
                break;
            }
        }
    }

    /**
     * 移除特定 Target (如 Component) 註冊過的所有聊天監聽器
     */
    public static targetOff(target: any) {
        if (!target) return;
        this.listeners.forEach((set) => {
            set.forEach((item) => {
                if (item.target === target) {
                    set.delete(item);
                }
            });
        });
    }

    /**
     * 派發聊天事件
     */
    private static emit<K extends ChatEventKey>(event: K, data: ChatEventMap[K]) {
        const set = this.listeners.get(event);
        if (set) {
            const items = Array.from(set);
            items.forEach((item) => {
                if (item.target) {
                    item.callback.call(item.target, data);
                } else {
                    item.callback(data);
                }
            });
        }
    }
}
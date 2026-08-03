import { _decorator, Component, Node, director} from 'cc';
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { SceneLoader } from 'db://assets/Scripts/Manager/SceneLoader';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';

const { ccclass, property } = _decorator;

/**
 * Socket管理中心
 */
@ccclass('SocketManager')
export class SocketManager extends SingletonComponent<SocketManager> {
    private serverUrl: string = 'http://localhost:3000';
    
    public socket: Socket | null = null;
    public playerId: string = '';

    /**
     * 建立 Socket.IO 連線
     */
    public connectToServer() {
        console.log(`正在嘗試連線至 Server: ${this.serverUrl}`);

        // 初始化 Socket 連線
        this.socket = io(this.serverUrl, {
            transports: ['websocket'], // 指定使用原生的 WebSocket 協議傳輸，效能最好
            reconnection: true,        // 允許自動重連
        });

        // 監聽:"connect"[連線成功]
        this.socket.on('connect', () => {
            console.log(`已成功連接至伺服器！Socket ID: ${this.socket?.id}`);
        });
        
        // 監聽: "disconnect"[斷線]
        this.socket.on('disconnect', (reason: string) => {
            console.warn(`與伺服器斷開連線，原因: ${reason}`);
        });

        // 監聽: "connect_error"[連線錯誤]
        this.socket.on('connect_error', (error: Error) => {
            console.error(`連線伺服器失敗:`, error.message);
        });

        // 監聽: "init_player"[玩家初始化]
        this.socket.on('init_player', (data: { playerId: string; nickname: string; message: string }) => {
            
            PlayerData.playerId = data.playerId;
            PlayerData.nickname = data.nickname;

            console.log(`[玩家初始化完成] 收到 Server 原始 JSON 資料:\n${JSON.stringify(data, null, 2)}`);

            // 切換場景
            SceneLoader.getInstance().loadScene("LobbyScene");
        });
    }

    /**
     * 發送:修改暱稱
     */
    public sendUpdateNickname(newNickname: string) {
        if (!this.socket) return;

        this.socket.emit('update_nickname', { newNickname }, (response: { success: boolean; nickname?: string; message?: string }) => {
            if (response.success && response.nickname) {
                PlayerData.nickname = response.nickname;
                console.log(`[暱稱修改成功] 新暱稱: ${PlayerData.nickname}`);
            } else {
                console.error(`[暱稱修改失敗]: ${response.message}`);
            }
        });
    }
}



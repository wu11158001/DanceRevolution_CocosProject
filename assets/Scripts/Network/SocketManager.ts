import { _decorator, Component, Node, director} from 'cc';
import io from 'socket.io-client/dist/socket.io.js';
import type { Socket } from 'socket.io-client';

const { ccclass, property } = _decorator;

@ccclass('SocketManager')
export class SocketManager extends Component {
    // 定義 Server 連線網址 (本地測試使用 3000 port)
    private serverUrl: string = 'http://localhost:3000';
    
    // 保存 Socket 實例與玩家 ID
    public socket: Socket | null = null;
    public playerId: string = '';

    public static instance: SocketManager | null = null;

    onLoad() {
        if (SocketManager.instance === null) {
            SocketManager.instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.destroy();
            return;
        }

        this.connectToServer();
    }

    /**
     * 建立 Socket.IO 連線
     */
    private connectToServer() {
        console.log(`正在嘗試連線至 Server: ${this.serverUrl}`);

        // 初始化 Socket 連線
        this.socket = io(this.serverUrl, {
            transports: ['websocket'], // 指定使用原生的 WebSocket 協議傳輸，效能最好
            reconnection: true,        // 允許自動重連
        });

        // 監聽:[連線成功]
        this.socket.on('connect', () => {
            console.log(`已成功連接至伺服器！Socket ID: ${this.socket?.id}`);
        });
        
        // 監聽:[斷線]
        this.socket.on('disconnect', (reason: string) => {
            console.warn(`與伺服器斷開連線，原因: ${reason}`);
        });

        // 監聽:[連線錯誤]
        this.socket.on('connect_error', (error: Error) => {
            console.error(`連線伺服器失敗:`, error.message);
        });

        // 監聽: "init_player" [玩家初始化]
        this.socket.on('init_player', (data: { playerId: string; message: string }) => {
            this.playerId = data.playerId;
            console.log(`伺服器初始化完成！`);
            console.log(`拿到當前遊戲 session 的 PlayerID: ${this.playerId}`);
            console.log(`伺服器訊息: ${data.message}`);
        });
    }

    onDestroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}



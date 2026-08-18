import { _decorator, Button, Component, instantiate, Node } from 'cc';
import { SocketManager } from '../../../Network/SocketManager';
import { IRoomListData } from '../../../Data/RoomData';
import { RoomListItem } from './RoomListItem';
import { PlayerData } from '../../../Data/PlayerData';
import { ViewManager } from '../../../Manager/ViewManager';
import { MessagePopupView } from '../../Common/MessagePopupView';
import { LobbyView } from './LobbyView';
import { RoomView } from '../RoomView/RoomView';
const { ccclass, property } = _decorator;

/**
 * 房間列表介面
 */
@ccclass('RoomListView')
export class RoomListView extends Component {
    @property(Button)
    private btn_refresh: Button = null;

    @property(Node)
    private itemParent: Node = null;
    @property(Node)
    private roomListItemPrefab: Node = null;

    @property(LobbyView)
    private lobbyView: LobbyView = null;

    @property(Node)
    private emptyNode: Node = null;

    private roomListItems: RoomListItem[] = [];

    onDestroy() {        
        SocketManager.getInstance().socket?.off('room_list_updated');
    }

    start() {
        // 監聽: "room_list_updated" [房間列表更新]
        SocketManager.getInstance().socket?.on('room_list_updated', this.onUpdateList.bind(this));

        // 刷新按鈕
        this.btn_refresh.node.on(Button.EventType.CLICK, this.getRoomList, this);

        this.roomListItemPrefab.active = false;
        this.getRoomList();
    }

    /**
     * 獲取房間列表
     */
    private getRoomList() {
        SocketManager.getInstance().socket?.emit('get_room_list', (res: { success: boolean; rooms: IRoomListData[] }) => {
            if (res && res.success && Array.isArray(res.rooms)) {
                this.onUpdateList(res.rooms);
            } else {
                console.warn('[獲取房間列表失敗或格式錯誤]:', res);
            }
        });
    }

    /**
     * 更新房間列表
     * @param datas 
     */
    private onUpdateList(datas: IRoomListData[]) {
        // 先將所有舊列表項目隱藏
        this.roomListItems.forEach((item) => {
            if (item && item.node) {
                item.node.active = false;
            }
        });

        // 等待中的排前面
        const sortData = [...datas].sort((a, b) => {
            if (a.isStarting === b.isStarting) {
                return 0;
            }
            return a.isStarting ? 1 : -1;
        });

        // 刷新列表
        sortData.forEach((data, index) => {
            let item: RoomListItem | null = null;

            if (index >= this.roomListItems.length) {
                // 產出新節點
                const obj = instantiate(this.roomListItemPrefab);
                obj.setParent(this.itemParent);

                const roomListItem = obj.getComponent(RoomListItem);
                if (roomListItem) {
                    item = roomListItem;
                    this.roomListItems.push(item);
                }
            } else {
                // 重用舊節點
                item = this.roomListItems[index];
            }

            if (item) {
                item.node.active = true;
                item.setData(data, () => this.joinRoom(data.roomId));
            }
        });

        this.emptyNode.active = !sortData || sortData.length == 0;
    }

    /**
     * 加入指定房間
     * @param roomId 
     */
    private joinRoom(roomId: string) {
        SocketManager.getInstance().sendJoinRoom({ 
            roomId: roomId, 
            characterId: PlayerData.characterId }
        );
    }
}
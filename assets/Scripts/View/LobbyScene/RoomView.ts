import { _decorator, director, Button, Component, Label, Node, Vec3, v3, Camera, find, isValid, instantiate} from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { GameTool } from 'db://assets/Scripts/Tools/GameTool';
import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, IRoomUpdatedData } from 'db://assets/Scripts/Data/RoomData';
import { LobbyView } from 'db://assets/Scripts/View/LobbyScene/LobbyView';
import { UpdateRoomNameView } from 'db://assets/Scripts/View/LobbyScene/UpdateRoomNameView';
import { SelectSongView } from './SelectSongView/SelectSongView';
import { MessagePopupView } from '../Common/MessagePopupView';

const { ccclass, property } = _decorator;

/**
 * 房間介面
 */
@ccclass('RoomView')
export class RoomView extends BaseView {
    @property(Label)
    private label_roomName: Label = null;
    @property(Button)
    private btn_updateRoomName: Button = null;

    @property(Button)
    private btn_selectSong: Button = null;
    @property(Label)
    private label_selectSong: Label = null;

    @property(Button)
    private btn_exit: Button = null;

    @property(Button)
    private btn_readyOrStart: Button = null;
    @property(Label)
    private label_readyOrStart: Label = null;

    @property(Node)
    private switchBtnNode: Node = null;
    @property(Button)
    private btn_switchCharacterLeft: Button = null;
    @property(Button)
    private btn_switchCharacterRight: Button = null;

    @property(Node)
    private isHostNode: Node = null;

    @property(Node)
    private nicknameNode: Node = null;
    @property(Node)
    private label_nicknamePrefab: Node = null;

    @property(Node)
    private kickBtnNode: Node = null;
    @property(Node)
    private btn_kickPrefab: Node = null;

    @property(Node)
    private readyNode: Node = null;
    @property(Node)
    private label_readyPrefab: Node = null;

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(-0.5, 0.1, 0), 
        new Vec3(0.5, 0.1, 0), 
        new Vec3(-1.5, 0.1, 0), 
        new Vec3(1.5, 0.1, 0), 
    ];

    private characters: Node[] = [];
    private nicknameLabels: Label[] = [];
    private kickBtns: Button[] = [];
    private readyLabels: Node[] = [];

    private camera3D: Camera = null;

    private switchBtnPosOffset = v3(0, -0.2, 0);
    private isHostNodeOffset = v3(0, 1.85, 0);
    private nicknamePosOffset = v3(0, -0.35, 0);
    private kickPosOffset = v3(0, -0.2, 0);
    private readyPosOffset = v3(0, 1, 0);

    protected onDestroy(): void {
        SocketManager.getInstance().socket?.off('kicked_from_room');
    }

    protected onLoad() {
        // 監聽:"kicked_from_room" [被踢出房間]
        SocketManager.getInstance().socket?.on('kicked_from_room', this.onKicked.bind(this));
    }

    start() {
        // 更新房間名稱按鈕
        this.btn_updateRoomName.node.on(Button.EventType.CLICK, 
            () =>{
                ViewManager.getInstance().openView<UpdateRoomNameView>('UpdateRoomNameView', 'Popup');
            }, this);

        // 選擇歌曲按鈕
        this.btn_selectSong.node.on(Button.EventType.CLICK,
            () => {
                ViewManager.getInstance().openView<SelectSongView>('SelectSongView', 'Popup');
            }, this);

        // 離開按鈕
        this.btn_exit.node.on(Button.EventType.CLICK, 
            () =>{
                SocketManager.getInstance().sendLeaveRoom();
                ViewManager.getInstance().openView<LobbyView>('LobbyView', 'HUD').then(lobbyView => {
                    this.closeSelf();
                });                
            }, this);

        // 準備/開始按鈕
        this.btn_readyOrStart.node.on(Button.EventType.CLICK,
            () => {
                if(PlayerData.isHost) {
                    SocketManager.getInstance().sendStartGame();
                } else {
                    SocketManager.getInstance().sendToggleReady();
                }
            }, this);

        // 更換角色按鈕(左)
        this.btn_switchCharacterLeft.node.on(Button.EventType.CLICK, () => { PlayerData.switchCharacterId(-1) }, this);

        // 更換角色按鈕(右)
        this.btn_switchCharacterRight.node.on(Button.EventType.CLICK, () => { PlayerData.switchCharacterId(1) }, this);
    }

    public onClose(): void {
        RoomData.onRoomUpdated = null;
        this.clearRoomData();
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 獲取歌單列表
        SocketManager.getInstance().sendGetSongs((data) => {RoomData.updateSongs(data)});

        // 尋找3D相機
        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;

        // 監聽:房間資料變更
        RoomData.onRoomUpdated = (data: IRoomUpdatedData) => {
            this.refreshRoom(data);
        }

        this.init();

        // 初始化畫面
        if (RoomData.roomId) {
            this.refreshRoom({
                roomId: RoomData.roomId,
                roomName: RoomData.roomName,
                hostId: RoomData.hostId,
                currentSong: RoomData.currentSong,
                players: RoomData.players
            });
        }
    }

    /**
     * 初始化
     */
    private init() {
        this.label_nicknamePrefab.active = false;
        this.btn_kickPrefab.active = false;
        this.label_readyPrefab.active = false;
        for (let i = 0; i < 4; i++) {
            // 產生暱稱物件
            const nicknameObj = instantiate(this.label_nicknamePrefab);
            nicknameObj.setParent(this.nicknameNode);
            nicknameObj.name = `label_nickname_${i}`;
            const nicknameLabel = nicknameObj.getComponent(Label);
            if(nicknameLabel) {
                this.nicknameLabels.push(nicknameLabel);
            }

            // 產生踢人按鈕
            const kickObj = instantiate(this.btn_kickPrefab);
            kickObj.setParent(this.kickBtnNode);
            kickObj.name = `btn_kick_${i}`;
            const kickBtn = kickObj.getComponent(Button);
            if(kickBtn) {
                this.kickBtns.push(kickBtn);
            }

            // Ready準備完成物件
            const readyObj = instantiate(this.label_readyPrefab);
            readyObj.setParent(this.readyNode);
            readyObj.name = `label_ready_${i}`;
            this.readyLabels.push(readyObj);
        }
    }

    /**
     * 清除房間資訊
     */
    private clearRoomData() {
        // 角色3D
        this.characters.forEach((characterNode) => {
            if(isValid(characterNode, true)) {
                characterNode.destroy();
            }
        });
        this.characters = [];

        // 暱稱
        this.nicknameLabels.forEach((nickname) => {
            nickname.node.active = false;
        });

        // 踢除按鈕
        this.kickBtns.forEach((kickBtn) => {
            kickBtn.node.active = false;
            kickBtn.node.targetOff(this);
        });

        // Ready字樣
        this.readyLabels.forEach((readyLabel) => {
            readyLabel.active = false;
        });

        // 選擇歌曲按鈕
        this.btn_selectSong.node.active = false;
    }

    /**
     * 被踢出房間
     * @param data 
     */
    private onKicked(data) {
        // 清除房間資料
        RoomData.reset();

        // 彈出提示並切換回大廳 View
        ViewManager.getInstance().openView<MessagePopupView>("MessagePopupView", "Highest").then(popup => {
            popup?.setData(
                data.message, 
                () => {
                    ViewManager.getInstance().openView<LobbyView>('LobbyView', 'HUD');
                    this.closeSelf();
                }, 
                null, 
                false
            );
        });
    }

    /**
     * 刷新房間
     * @param data 
     */
    private refreshRoom(data: IRoomUpdatedData) {
        this.label_roomName.string = `房間: ${data.roomName}`;
        this.label_selectSong.string = `歌曲: ${data.currentSong.name} (${data.currentSong.bpm} BPM)`;

        let isCanStart = true;
        const isHost = PlayerData.isHost;

        // 清除房間資訊
        this.clearRoomData();

        // 所有玩家狀態
        let index = 0;
        data.players.forEach(player => {
            // 是否是本地角色
            let isSelf = player.playerId == PlayerData.playerId;

            if(!player.isReady) isCanStart = false;

            // 3D角色
            const character = CharacterDataManager.getInstance().create(player.characterId);
            if (character) {
                this.characters[index] = character;
                const currentScene = director.getScene();
                if (currentScene) {
                    currentScene.addChild(this.characters[index]);
                    this.characters[index].setPosition(this.characterSeatPos[index]);
                }

                // 暱稱
                this.nicknameLabels[index].node.active = true;
                this.nicknameLabels[index].string = player.nickname;
                GameTool.getInstance().follow3DNode(
                    this.camera3D,
                    character,
                    this.nicknameLabels[index].node,
                    this.nicknamePosOffset
                );

                // Ready字樣
                if(!player.isHost && player.isReady) {
                    this.readyLabels[index].active = true;
                    GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.readyLabels[index],
                        this.readyPosOffset
                );
                }

                // 僅限房主
                if(isHost && !player.isHost) {
                    // 踢除按鈕
                    this.kickBtns[index].node.active = true;
                    this.kickBtns[index].node.on(Button.EventType.CLICK, () => {
                        SocketManager.getInstance().sendKickPlayer(player.playerId);
                    }, this);
                    GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.kickBtns[index].node,
                        this.kickPosOffset
                    );
                }

                // 房主玩家
                if(player.isHost) {
                    // 房主顯示節點
                    GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.isHostNode,
                        this.isHostNodeOffset,
                    )
                    // 選擇歌曲按鈕
                    this.btn_selectSong.node.active = true;
                }

                // 本地玩家
                if(isSelf) {
                    // 切換角色按鈕
                    GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.switchBtnNode,
                        this.switchBtnPosOffset
                    )
                }
            }

            index++;
        });

        // UI設置
        if(isHost) {
            this.label_readyOrStart.string = "開始遊戲";
            this.btn_readyOrStart.interactable = isCanStart;
            this.btn_updateRoomName.node.active = true;
        } else {
            this.label_readyOrStart.string = PlayerData.isReady ? "取消準備" : "準備";
            this.btn_readyOrStart.interactable = true;
            this.btn_updateRoomName.node.active = false;
        }
    }
}



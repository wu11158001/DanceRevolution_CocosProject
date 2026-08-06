import { _decorator, director, Button, Component, Label, Node, Vec3, v3, Camera, find} from 'cc';

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

    @property(Label)
    private nicknameLabels: Label[] = [];

    @property(Button)
    private kickBtns: Button[] = [];

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(-0.5, 0.1, 0), 
        new Vec3(0.5, 0.1, 0), 
        new Vec3(-1.5, 0.1, 0), 
        new Vec3(1.5, 0.1, 0), 
    ];

    private characters: Node[] = [];

    private camera3D: Camera = null;

    private switchBtnPos = v3();
    private switchBtnPosOffset = v3(0, -100, 0);

    private isHostNodePos = v3();
    private isHostNodeOffset = v3(0, 540, 0);

    private nicknamePosOffset = v3(0, -50, 0);

    private kickPosOffset = v3(0, -100, 0);

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
     * 清除房間資訊
     */
    private clearRoomData() {
        // 角色3D
        this.characters.forEach((characterNode) => {
            characterNode.destroy();
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
                const nicknameLabelPos = GameTool.getInstance().follow3DNode(
                    this.camera3D,
                    character,
                    this.nicknameLabels[index].node,
                    Vec3.ZERO
                );
                if (nicknameLabelPos) { 
                    const finalPos = v3();
                    Vec3.add(finalPos, nicknameLabelPos, this.nicknamePosOffset);
                    this.nicknameLabels[index].node.setPosition(finalPos);
                }

                // 僅限房主
                if(isHost && !player.isHost) {
                    // 踢除按鈕
                    this.kickBtns[index].node.active = true;
                    this.kickBtns[index].node.on(Button.EventType.CLICK, () => {
                        SocketManager.getInstance().sendKickPlayer(player.playerId);
                    }, this);
                    const kickBtnPos = GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.kickBtns[index].node,
                        Vec3.ZERO
                    );
                    if (kickBtnPos) { 
                        const finalPos = v3();
                        Vec3.add(finalPos, kickBtnPos, this.kickPosOffset);
                        this.kickBtns[index].node.setPosition(finalPos);
                    }
                }

                // 房主玩家
                if(player.isHost) {
                    // 房主顯示節點
                    if(GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.isHostNode,
                        Vec3.ZERO,
                        this.isHostNodePos
                    )) {
                        this.isHostNode.setPosition(this.isHostNodePos.add(this.isHostNodeOffset));
                    }
                }

                // 本地玩家
                if(isSelf) {
                    // 切換角色按鈕
                    if(GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.switchBtnNode,
                        Vec3.ZERO,
                        this.switchBtnPos
                    )) {
                        this.switchBtnNode.setPosition(this.switchBtnPos.add(this.switchBtnPosOffset));
                    }
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



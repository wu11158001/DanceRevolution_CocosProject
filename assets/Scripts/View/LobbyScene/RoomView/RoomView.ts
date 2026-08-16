import { _decorator, director, Button, Component, Label, Node, Vec3, v3, Camera, find, isValid, instantiate} from 'cc';

import { BaseView } from 'db://assets/Scripts/View/BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { ViewManager } from 'db://assets/Scripts/Manager/ViewManager';
import { GameTool } from 'db://assets/Scripts/Tools/GameTool';
import { CharacterDataManager } from 'db://assets/Scripts/Manager/CharacterDataManager';
import { PlayerData } from 'db://assets/Scripts/Data/PlayerData';
import { RoomData, IRoomData } from 'db://assets/Scripts/Data/RoomData';
import { UpdateRoomNameView } from 'db://assets/Scripts/View/LobbyScene/UpdateRoomNameView';
import { SelectSongView } from '../SelectSongView/SelectSongView';
import { MessagePopupView } from '../../Common/MessagePopupView';
import { CharacterControl } from '../../../Game/CharacterControl';
import { FixedMarqueeText } from '../../../Tools/FixedMarqueeText';
import { RoomPlayerInfoVIew } from './RoomPlayerInfoVIew';
import { LobbyView } from '../LobbyView/LobbyView';
import { CHAT_PLACE, ChatManager } from '../../../Manager/ChatManager';
import { ChatView } from '../../Common/ChatView/ChatView';

const { ccclass, property } = _decorator;

/**
 * 房間角色資料
 */
interface IRoomCharacterData {
    characterControl: CharacterControl;
    isReady: boolean;
    seat: number;
}

/**
 * 房間介面
 */
@ccclass('RoomView')
export class RoomView extends BaseView {
    @property(Node)
    private bgNode: Node = null;

    @property(Label)
    private label_roomName: Label = null;
    @property(Button)
    private btn_updateRoomName: Button = null;

    @property(Button)
    private btn_selectSong: Button = null;
    @property(FixedMarqueeText)
    private fixedMarqueeText: FixedMarqueeText = null;

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
    private playerInfoNpde: Node = null;
    @property(Node)
    private playerInfoPrefab: Node = null;

    @property(Button)
    private btn_recruit: Button = null;

    // 角色位置
    private readonly characterSeatPos: Vec3[] = [
        new Vec3(-0.8, 0.25, 0), 
        new Vec3(0.7, 0.25, 0), 
        new Vec3(2.2, 0.25, 0), 
        new Vec3(-2.3, 0.25, 0), 
    ];

    private camera3D: Camera = null;

    private characters: Node[] = [];
    private playerInfos: RoomPlayerInfoVIew[] = [];
    private characterMap: Map<string, IRoomCharacterData> = new Map();

    private switchBtnPosOffset = v3(0, -0.4, 0);
    private playerInfoPosOffset = v3(0, -0.2, 0);

    private currentSongName: string = "";
    private chatView: ChatView = null;

    protected onDestroy(): void {
        SocketManager.getInstance().socket?.off('kicked_from_room');

        // 角色3D
        this.characters.forEach((characterNode) => {
            if(isValid(characterNode, true)) {
                characterNode.destroy();
            }
        });
        this.characters = [];

        this.bgNode.destroy();

        RoomData.onRoomUpdated = null;
        this.chatView.onClose();
    }

    protected onLoad() {
        // 監聽:"kicked_from_room" [被踢出房間]
        SocketManager.getInstance().socket?.on('kicked_from_room', this.onKicked.bind(this));
    }

    start() {
        // 招募按鈕
        this.btn_recruit.node.on(Button.EventType.CLICK, () =>{
            ChatManager.sendRoomRecruit();
        }, this);

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
                    // 清除房間聊天訊息
                    ChatManager.clearRoomMessageData();
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

    public async onOpen(params?: any) {
        // 開啟聊天介面
        this.chatView = await ViewManager.getInstance().openView<ChatView>(
            'ChatView', 
            'Popup',
            false, 
            { chatPlace: CHAT_PLACE.RoomView }
        );

        // 獲取歌單列表
        SocketManager.getInstance().sendGetSongs((data) => {RoomData.updateSongs(data)});

        // 尋找3D相機
        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;

        // 監聽:房間資料變更
        RoomData.onRoomUpdated = (data: IRoomData) => {
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

        this.bgNode.setParent(ViewManager.getInstance().BackgroundCanvas);

        super.onOpen(params);
    }

    /**
     * 初始化
     */
    private init() {
        this.playerInfoPrefab.active = false;

        for (let i = 0; i < 4; i++) {
            // 產生玩家訊息物件
            const obj = instantiate(this.playerInfoPrefab);
            obj.setParent(this.playerInfoNpde);
            obj.name = `playerInfo_${i}`;
            const playerInfo = obj.getComponent(RoomPlayerInfoVIew);
            if(playerInfo) {
                this.playerInfos.push(playerInfo);
            }
        }
    }

    /**
     * 被踢出房間
     * @param data 
     */
    private onKicked(data) {
        // 清除房間資料
        RoomData.reset();

        // 清除房間聊天訊息
        ChatManager.clearRoomMessageData();

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
     * 清除房間資訊
     */
    private clearRoomData() {
        // 玩家訊息
        this.playerInfos.forEach((playerInfo) => {
            if(isValid(playerInfo.node)) {
                playerInfo.node.active = false;
            }            
        });
    }

    /**
     * 刷新房間
     * @param data 
     */
    private refreshRoom(data: IRoomData) {
        this.label_roomName.string = `房間: ${data.roomName}`;
        if(this.currentSongName != data.currentSong.name) {
            this.fixedMarqueeText.setTitle(`${data.currentSong.name} (BPM:${data.currentSong.bpm})`)
        }
        this.currentSongName = data.currentSong.name;

        let isLocalAndHost = PlayerData.isHost;
        let isCanStart = true;

        // 清除房間資訊
        this.clearRoomData();
        // 記錄當前房間內的 playerId
        const currentPlayerIds = new Set<string>();

        // 所有玩家狀態
        let index = 0;
        data.players.forEach(player => {
            currentPlayerIds.add(player.playerId);

            // 是否是本地角色
            let isSelf = player.playerId == PlayerData.playerId;

            if(!player.isReady) isCanStart = false;

            let characterCache = this.characterMap.get(player.playerId);

            // 如果玩家角色或座位變更
            if (characterCache && 
                (!isValid(characterCache.characterControl.node) || 
                 characterCache.characterControl.characterIndex !== player.characterId ||
                 characterCache.seat != index || 
                 characterCache.isReady != player.isReady)) 
            {
                if (isValid(characterCache.characterControl.node)) characterCache.characterControl.node.destroy();
                characterCache = null;
            }

            // 不存在快取
            if(!characterCache) {
                // 創建3D角色
                const character = CharacterDataManager.getInstance().create(player.characterId);
                if (character) {
                    const characterControl = character.getComponent(CharacterControl);

                    characterCache = {
                        characterControl: characterControl,
                        isReady: player.isReady,
                        seat: index
                    }
                    this.characterMap.set(player.playerId, characterCache);

                    // 3D角色位置
                    this.characters[index] = character;
                    const currentScene = director.getScene();
                    if (currentScene) {
                        currentScene.addChild(this.characters[index]);
                        this.characters[index].setPosition(this.characterSeatPos[index]);
                    }

                    // 準備/未準備動畫
                    if(characterControl) {
                        if(player.isReady && !player.isHost) {
                            characterControl.playAnimation('ReadyPose', 0, false);
                        } else {
                            characterControl.playAnimation('Idle', 0, false);
                        }
                    }

                    GameTool.getInstance().follow3DNode(
                        this.camera3D,
                        character,
                        this.playerInfos[index].node,
                        this.playerInfoPosOffset,
                    );

                    // 選擇歌曲按鈕
                    this.btn_selectSong.node.active = isLocalAndHost;

                    // 本地玩家
                    if(isSelf) {
                        // 更換歌曲按鈕
                        this.btn_selectSong.node.active = isLocalAndHost;

                        if(!player.isReady || isLocalAndHost) {
                            // 切換角色按鈕
                            this.btn_switchCharacterLeft.node.active = true;
                            this.btn_switchCharacterRight.node.active = true;

                            GameTool.getInstance().follow3DNode(
                                this.camera3D,
                                character,
                                this.switchBtnNode,
                                this.switchBtnPosOffset,
                            )
                        } else {
                            this.btn_switchCharacterLeft.node.active = !player.isReady;
                            this.btn_switchCharacterRight.node.active = !player.isReady;
                        }
                    }
                }
            }

            // 玩家訊息
            this.playerInfos[index].node.active = true
            this.playerInfos[index].setData({
                playerId: player.playerId,
                isHost: player.isHost,
                nickname:  player.nickname,
                isReady: player.isReady,
                kcikAction: () => {
                    SocketManager.getInstance().sendKickPlayer(player.playerId);
                }
            });

            index++;
        });

        // 清理已經離開房間的玩家 3D 節點
        this.characterMap.forEach((cache, playerId) => {
            if (!currentPlayerIds.has(playerId)) {
                if (isValid(cache.characterControl.node)) {
                    cache.characterControl.node.destroy();
                }
                this.characterMap.delete(playerId);
            }
        });

        // UI設置
        if(isLocalAndHost) {
            this.label_readyOrStart.string = "START";
            this.btn_readyOrStart.interactable = isCanStart;
            this.btn_updateRoomName.node.active = true;
            this.btn_recruit.node.active = data.players.length < 4;
        } else {
            this.label_readyOrStart.string = PlayerData.isReady ? "CANCEL" : "READY";
            this.btn_readyOrStart.interactable = true;
            this.btn_updateRoomName.node.active = false;
            this.btn_recruit.node.active = false;
        }
    }
}



import { _decorator, Button, Component, instantiate, Node } from 'cc';
import { BaseView } from '../../BaseView';
import { IGameResult } from '../../../Manager/GameManager';
import { GameResultItem } from './GameResultItem';
import { SceneLoader } from '../../../Manager/SceneLoader';
const { ccclass, property } = _decorator;

/**
 * 遊戲結果介面
 */
@ccclass('GameResultView')
export class GameResultView extends BaseView {
    @property(Node)
    private itemNode: Node = null;
    @property(Node)
    private itemPrefab: Node = null;
    @property(Button)
    private btn_confirm: Button = null;

    protected start(): void {
        this.btn_confirm.node.on(Button.EventType.CLICK, () => {
            SceneLoader.getInstance().loadScene('LobbyScene', true);
        }, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.itemPrefab.active = false;
    }

    public setData(data: IGameResult) {
        // 由高到低排序
        const sortedPlayers = [...data.results].sort((a, b) => b.totalScore - a.totalScore);

        sortedPlayers.forEach((playerData, index) => {
            const obj = instantiate(this.itemPrefab);
            obj.active = true;
            obj.setParent(this.itemNode);

            const gameResultItem = obj.getComponent(GameResultItem);
            if(gameResultItem) {
                gameResultItem.setData(playerData, index);
            }
        });
    }
}



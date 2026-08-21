import { _decorator, Component, Node, game, Game, view, ResolutionPolicy} from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';

const { ccclass, property } = _decorator;

@ccclass('EntryView')
export class EntryView extends Component {

    protected onLoad(): void {
        // 保持比例顯示
        view.setDesignResolutionSize(1920, 911, ResolutionPolicy.SHOW_ALL);

        // 阻擋背景自動 pause
        game.pause = () => {};
        //阻擋切回時 restore
        game.resume = () => {};
    }

    start() {
        SocketManager.getInstance().connectToServer();
    }
}
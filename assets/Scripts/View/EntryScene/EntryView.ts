import { _decorator, Component, Node, game, Game, view, ResolutionPolicy} from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';

const { ccclass, property } = _decorator;

@ccclass('EntryView')
export class EntryView extends Component {

    protected onLoad(): void {
        view.setDesignResolutionSize(1920, 911, ResolutionPolicy.SHOW_ALL);
    }

    start() {
        SocketManager.getInstance().connectToServer();
    }
}
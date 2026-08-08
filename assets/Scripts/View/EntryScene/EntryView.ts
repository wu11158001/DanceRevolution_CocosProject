import { _decorator, Component, Node, game, Game} from 'cc';

import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';

const { ccclass, property } = _decorator;

@ccclass('EntryView')
export class EntryView extends Component {

    start() {
        SocketManager.getInstance().connectToServer();
    }
}
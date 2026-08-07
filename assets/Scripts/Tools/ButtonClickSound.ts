import { _decorator, Button, Component, Node } from 'cc';

import { AudioManager, SFX_TYPE } from 'db://assets/Scripts/Manager/AudioManager';

const { ccclass, property } = _decorator;

/**
 * 點擊音效工具
 */
@ccclass('BtnClick')
export class BtnClick extends Component {
    @property({type: SFX_TYPE})
    private sfxType: SFX_TYPE = SFX_TYPE.ButtonClick;

    private mainBtn: Button = null;

    start() {
        this.mainBtn = this.getComponent(Button);
        if(this.mainBtn) {
            this.mainBtn.node.on(Button.EventType.CLICK, () => {
                AudioManager.getInstance().playSFX(this.sfxType);
            }, this);
        }
    }
}



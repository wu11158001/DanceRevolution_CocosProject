import { _decorator, Camera, Color, Label, Node, find, v3, CCFloat } from 'cc';
import { BaseView } from '../BaseView';
import { GameTool } from '../../Tools/GameTool';
import { AudioManager, SFX_TYPE } from '../../Manager/AudioManager';
const { ccclass, property } = _decorator;

/**
 * 打擊結果介面
 */
@ccclass('BeatResultView')
export class BeatResultView extends BaseView {
    @property(Label)
    private label_result: Label = null;
    @property([Color])
    private resultColors: Color[] = [];
    @property({type: CCFloat})
    private closeTime = 2.5;
    @property({type: CCFloat})
    private selfSize = 130;
    @property({type: CCFloat})
    private otherSize = 40;

    private camera3D: Camera = null;
    private target3D: Node = null;

    private posOffset = v3(0, 1.85, 0);

    public closeSelf() {
        this.unschedule(this.closeSelf);
        this.target3D = null;
        
        this.node.destroy();
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 尋找3D相機
        const cameraNode = find('Camera_3D'); 
        this.camera3D = cameraNode ? cameraNode.getComponent(Camera) : null;
    }

    protected lateUpdate(dt: number) {
        this.updateUIPosition();
    }

    /**
     * 更新位置
     */
    private updateUIPosition() {
        if (this.target3D && this.camera3D) {
            GameTool.getInstance().follow3DNode(
                this.camera3D,
                this.target3D,
                this.label_result.node,
                this.posOffset
            );
        }
    }

    /**
     * 顯示打擊結果
     * @param result 
     */
    public showResult(result: string, perfectCombo: number, isSelf: boolean, character3D: Node) {
        let resultStr = '';
        let colorIndex = 0;

        switch(result) {
            case 'PERFECT': 
                if(perfectCombo > 1) resultStr = `PERFECT x${perfectCombo}`;
                else resultStr = 'PERFECT';
                colorIndex = 0;
                if(isSelf) AudioManager.getInstance().playSFX(SFX_TYPE.BeatPerfect, 1);
                break;

            case 'GREAT':
                resultStr = 'GREAT';
                colorIndex = 1;
                if(isSelf) AudioManager.getInstance().playSFX(SFX_TYPE.BeatNromal, 1);
                break;

            case 'GOOD':
                resultStr = 'GOOD';
                colorIndex = 2
                if(isSelf) AudioManager.getInstance().playSFX(SFX_TYPE.BeatNromal, 1);
                break;

            case 'MISS':
                resultStr = 'MISS';
                colorIndex = 3;
                if(isSelf) AudioManager.getInstance().playSFX(SFX_TYPE.BeatMiss, 1);
                break;
        }

        this.label_result.string = resultStr;
        this.label_result.color = this.resultColors[colorIndex];
        this.label_result.fontSize = isSelf ? this.selfSize : this.otherSize;

        if(!isSelf)  {
            this.target3D = character3D;
            this.updateUIPosition();
        } else {
            this.target3D = null;
            this.label_result.node.setPosition(0, 0, 0);
        }

        this.unschedule(this.closeSelf);
        this.scheduleOnce(this.closeSelf, this.closeTime);
    }
}
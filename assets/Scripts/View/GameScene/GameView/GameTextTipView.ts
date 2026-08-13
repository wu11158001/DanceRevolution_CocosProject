import { _decorator, Component, Node, Label, UIOpacity, Color, Tween, tween, Vec3} from 'cc';
import { BaseView } from '../../BaseView';
const { ccclass, property } = _decorator;

/**
 * 遊戲文字提示介面
 */
@ccclass('GameTextTipView')
export class GameTextTipView extends BaseView {
    @property(Label)
    private label_tip: Label = null;
    @property(UIOpacity)
    private uiOpacity_tip: UIOpacity = null;

    @property(Color)
    private readyColor: Color = new Color(255,255,255,255);
    @property(Color)
    private startColor: Color = new Color(255,255,255,255);
    @property(Color)
    private countDownColor: Color = new Color(255,255,255,255);
    @property(Color)
    private finishColor: Color = new Color(255,255,255,255);

    protected start(): void {
        this.uiOpacity_tip.opacity = 0;
    }

    /**
     * 顯示提示文字
     * @param tipString 
     * @param color 
     * @param isFade    // 是否使用淡出
     */
    private async showTip(tipString: string, color: Color, isFade: boolean = true) {
        Tween.stopAllByTarget(this.label_tip.node);
        Tween.stopAllByTarget(this.uiOpacity_tip);

        this.uiOpacity_tip.opacity = 255;
        this.label_tip.string = tipString;
        this.label_tip.color = color;

        await new Promise<void>(resolve => {
            if(isFade) {
                tween(this.uiOpacity_tip)
                    .delay(0.6)                       // 停留
                    .to(0.4, { opacity: 0 })          // 淡出
                    .call(() => {
                        this.uiOpacity_tip.opacity = 0;
                        resolve();
                    })
                    .start();
            } else {
                resolve();
            }
        });
    }

    /**
     * 遊戲開始
     */
    public onGameStart() {
        this.showTip('READY', this.readyColor, false)
    }

    /**
     * 首個譜面發送前的倒數
     * @param countdownSec 共倒數秒數
     * @param sequence 倒數文字
     */
    public async onStartCount(data: {countdownSec: number, sequence: string[]}) {
        for(let i = 0; i < data.countdownSec; i++) {
            let color = i === 0 ? this.startColor : this.countDownColor;
            this.showTip(data.sequence[i], color);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * 歌曲完成
     */
    public onGameFinish() {
        this.showTip('FINISH', this.finishColor);
    }
}



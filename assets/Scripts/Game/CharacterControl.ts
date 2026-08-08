import { _decorator, animation, Component } from 'cc';
import { CharacterDataManager } from '../Manager/CharacterDataManager';
const { ccclass, property } = _decorator;

@ccclass('CharacterControl')
export class CharacterControl extends Component {
    private animController: animation.AnimationController | null = null;

    start() {
        this.animController = this.node.getComponent(animation.AnimationController);
    }


    /**
     * 播放舞蹈動畫並自動縮放到 1 小節長度
     * @param key 動畫圖觸發鍵 / Clip 名稱 (例如 'Dance_0')
     * @param barIntervalMs 伺服器傳來的 1 小節毫秒數 (例如 2000)
     */
    public playAnimation(key: string, barIntervalMs: number) {
        if (!this.animController) return;

        // 取得 Clip 原始長度
        const originalDurationSec = CharacterDataManager.getInstance().getAnimationClipDuration(key);
        if (originalDurationSec <= 0) return;

        // 計算目標長度 (秒) 與所需的播放倍數 (Speed)
        const targetDurationSec = barIntervalMs / 1000;
        let requiredSpeed = originalDurationSec / targetDurationSec;

        // 不超過速度上限
        if(requiredSpeed > 2) requiredSpeed = 1.8;

        // 寫入速度變數與觸發狀態
        this.animController.setValue('DanceSpeed', requiredSpeed);
        this.animController.setValue(key, true);

        // 重置 Bool / Trigger 狀態
        this.scheduleOnce(() => {
            if (this.animController) {
                this.animController.setValue(key, false);
            }
        }, 0.1);
    }
}
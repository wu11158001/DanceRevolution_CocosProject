import { _decorator, Animation, Component, TiledObjectGroup } from 'cc';
import { CharacterDataManager } from '../Manager/CharacterDataManager';
const { ccclass, property } = _decorator;

/**
 * 角色3D控制
 */
@ccclass('CharacterControl')
export class CharacterControl extends Component {
    private anim: Animation | null = null;

    private isInit: boolean = false;

    protected start() {
        this.init();
    }

    private init() {
        if(!this.isInit) {
            this.isInit = true;
            this.anim = this.node.getComponent(Animation);
            if(this.anim) {
                this.setClips();
                this.anim.play('Idle');
            }
        }
    }

    /**
     * 設置所有角色動畫Clips
     */
    private setClips() {
        CharacterDataManager.getInstance().characterClips.forEach((clip) => {
            this.anim.addClip(clip);
        });
    }

    /**
     * 播放舞蹈動畫並自動縮放到 1 小節長度
     * @param index 舞步動畫index
     * @param animPhase 該舞步的階段(1=重頭開始, 2=重一半位置開始)
     * @param barIntervalMs 伺服器傳來的 1 小節毫秒數
     */
    public playDanceAnimation(index: number, animPhase: number, barIntervalMs: number) {
        if(!this.isInit) this.init();
        if (!this.anim) return;

        const clipName = `Dance_${index}`;
        const state = this.anim.getState(clipName);

        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${clipName}`);
            return;
        }

        const targetDurationSec = barIntervalMs / 1000;
        state.speed = state.duration / targetDurationSec;
        this.anim.play(clipName);

        // 如果是2則從一半進度開始撥放
        const startProgress = animPhase === 2 ? 0.5 : 0;
        state.time = state.duration * startProgress;

        // 強制採樣，確保當前畫格立刻更新至該時間點，防止出現 1 幀的閃爍
        state.sample();
    }

    /**
     * 撥放動畫並自動縮放到 1 小節長度
     * @param key 動畫名稱/Clip名稱
     * @param barIntervalMs 伺服器傳來的 1 小節毫秒數
     */
    public playAnimation(key: string, barIntervalMs: number = 0) {
        if(!this.isInit) this.init();
        if (!this.anim) return;
        
        const state = this.anim.getState(key);

        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${key}`);
            return;
        }

        // 計算並設定播放速率
        const targetDurationSec = barIntervalMs / 1000;
        state.speed = targetDurationSec > 0 ? state.duration / targetDurationSec : 1;

        // 從頭開始播放
        state.time = 0;
        this.anim.play(key);
    }
}
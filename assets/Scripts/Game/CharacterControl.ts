import { _decorator, Animation, Component, SkeletalAnimation } from 'cc';
import { CharacterDataManager } from '../Manager/CharacterDataManager';
const { ccclass, property } = _decorator;

/**
 * 角色3D控制
 */
@ccclass('CharacterControl')
export class CharacterControl extends Component {
    @property({tooltip: "角色編號"})
    private characterIndex: number = 0;

    private anim: Animation | null = null;

    private crossFade: number = 0.2;
    private isInit: boolean = false;

    protected start() {
        this.init();
    }

    private init() {
        if(!this.isInit) {
            this.isInit = true;

            if(!this.anim) this.anim = this.node.addComponent(Animation);
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
        CharacterDataManager.getInstance().getAnimationClips(this.characterIndex)?.forEach((clip) => {
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
        if (!this.isInit) this.init();
        if (!this.anim) return;
        
        const clipName = `Dance_${index}`;
        const state = this.anim.getState(clipName);

        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${clipName}`);
            return;
        }

        // 設定速度與時間進度
        const targetDurationSec = barIntervalMs / 1000;
        state.speed = state.duration / targetDurationSec;
        const startProgress = animPhase === 2 ? 0.5 : 0;
        state.time = state.duration * startProgress;

        // 進行強制採樣更新骨骼
        state.sample();

        // 執行過渡
        this.anim.crossFade(clipName, this.crossFade);
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
        this.anim.crossFade(key, this.crossFade);
    }
}
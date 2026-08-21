import { _decorator, Animation, AnimationState, Component, Node, AnimationClip } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 角色3D控制器
 */
@ccclass('CharacterControl')
export class CharacterControl extends Component {    
    @property({ tooltip: "角色編號", visible: true })
    private _characterIndex: number = 0;
    @property({ type: Node, visible: true })
    private _model3D: Node = null;
    @property(Animation)
    private anim: Animation = null;
    
    /**
     * 舞蹈模式標記
     * 用途：防止遊戲中的舞步動畫被其他動畫打斷
     * - true: 正在播放舞蹈動畫，完成前不允許切換
     * - false: 可以自由切換動畫
     */
    private isDance: boolean = false;

    /**
     * 動畫淡入淡出時間（秒）
     */
    private readonly crossFade: number = 0.35;

    /** 
     * 獲取角色編號
     */
    public get characterIndex(): number {
        return this._characterIndex;
    }

    /** 
     * 獲取角色3D模型節點
     */
    public get model3D(): Node {
        return this._model3D;
    }

    protected onEnable(): void {
        if (this.anim) {
            this.anim.on(Animation.EventType.FINISHED, this.onAnimFinished, this);
        }
    }

    protected onDisable(): void {
        if (this.anim) {
            this.anim.off(Animation.EventType.FINISHED, this.onAnimFinished, this);
        }
    }

    protected onDestroy(): void {
        if (this.anim) {
            this.anim.off(Animation.EventType.FINISHED, this.onAnimFinished, this);
        }
    }

    /** 
     * 動畫播放完畢的回調
     * @param type 事件類型
     * @param state 當前動畫狀態
     */
    private onAnimFinished(type: Animation.EventType, state: AnimationState): void {
        // 計算動畫播放進度（0.0 ~ 1.0）
        const progress = state.time / state.duration;

        // 條件判斷：
        // 1. 非舞蹈模式：直接返回待機
        // 2. 舞蹈模式且動畫幾乎播放完畢（> 90%）：返回待機
        if (!this.isDance || 
            (state.clip.name.startsWith('Dance_') && progress > 0.9)) {
            this.playAnimation('Idle');
        }

        // 重置舞蹈模式標記
        this.isDance = false;
    }

    /**
     * 播放舞蹈動畫並自動縮放到指定節拍長度
     * @param index 舞步動畫索引（對應 Dance_0, Dance_1, ...）
     * @param animPhase 動畫起始階段（1~4，對應四分音符的位置）
     * @param barIntervalMs 一個小節的時間長度（毫秒）
     */
    public playDanceAnimation(index: number, animPhase: number, barIntervalMs: number): void {
        if (!this.anim) return;
        
        const clipName = `Dance_${index}`;
        const state = this.anim.getState(clipName);
        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${clipName}`);
            return;
        }

        // 標記為舞蹈模式（防止被其他動畫打斷）
        this.isDance = true;

        state.wrapMode = AnimationClip.WrapMode.Loop;
        this.anim.crossFade(clipName, this.crossFade);

        // 計算目標動畫時長（毫秒轉秒）
        const targetClipDuration = barIntervalMs / 1000;
        
        // 計算播放速度倍率
        state.speed = state.duration / targetClipDuration;

        // 計算起始播放位置（根據 animPhase）
        // animPhase 1~4 對應 0%, 25%, 50%, 75% 的位置
        const startProgress = (animPhase - 1) / 4;
        state.time = state.duration * startProgress;
        
        // 立即採樣一次，確保動畫從正確位置開始
        state.sample();
    }

    /**
     * 播放一般動畫（可選擇是否同步到節拍）
     * @param key 動畫名稱（對應 Animation Clip 的名稱）
     * @param barIntervalMs 一個小節的時間長度（毫秒），0 表示不調整速度
     * @param isCrossFade 是否使用淡入淡出效果
     */
    public playAnimation(key: string, barIntervalMs: number = 0, isCrossFade: boolean = true): void {
        if (!this.anim) return;

        const state = this.anim.getState(key);
        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${key}`);
            return;
        }

        // 計算並設定播放速度
        if (barIntervalMs > 0) {
            const targetDurationSec = barIntervalMs / 1000;
            state.speed = state.duration / targetDurationSec;
        } else {
            state.speed = 1;
        }

        // 設定淡入時間
        let crossFadeTime = 0;
        if (isCrossFade) {
            crossFadeTime = this.crossFade;
            // 從頭開始播放
            state.time = 0;
        }

        // 播放動畫
        this.anim.crossFade(key, crossFadeTime);
    }
}
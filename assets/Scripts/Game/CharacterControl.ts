import { _decorator, Animation, Component, Node } from 'cc';
import { CharacterDataManager } from '../Manager/CharacterDataManager';
const { ccclass, property } = _decorator;

/**
 * 角色3D控制
 */
@ccclass('CharacterControl')
export class CharacterControl extends Component {
    @property({tooltip: "角色編號", visible: true})
    private _characterIndex: number = 0;
    @property({type: Node, visible: true})
    private _model3D: Node = null;
    @property(Animation)
    private anim: Animation = null;

    // 角色Index
    public get characterIndex() : number {
        return this._characterIndex;
    }

    // 角色3D
    public get model3D(): Node {
        return this._model3D;
    }

    private crossFade: number = 0.3;

    /**
     * 播放舞蹈動畫並自動縮放到 1 小節長度
     * @param index 舞步動畫index
     * @param animPhase 該舞步的階段
     * @param barIntervalMs 伺服器傳來的 1 小節毫秒數
     */
    public playDanceAnimation(index: number, animPhase: number, barIntervalMs: number) {
        if (!this.anim) return;
        
        const clipName = `Dance_${index}`;
        const state = this.anim.getState(clipName);

        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${clipName}`);
            return;
        }

        this.anim.crossFade(clipName, this.crossFade);
        const targetClipDuration = barIntervalMs / 1000;
        state.speed = state.duration / targetClipDuration;
        const startProgress = (animPhase - 1) / 4;
        state.time = state.duration * startProgress;
        state.sample();
    }

    /**
     * 撥放動畫並自動縮放到 1 小節長度
     * @param key 動畫名稱/Clip名稱
     * @param barIntervalMs 伺服器傳來的 1 小節毫秒數
     * @param isCrossFade 是否使用過度效果
     */
    public playAnimation(key: string, barIntervalMs: number = 0, isCrossFade: boolean = true) {
        if (!this.anim) return;
        
        const state = this.anim.getState(key);

        if (!state) {
            console.warn(`[CharacterControl] 找不到動畫 State: ${key}`);
            return;
        }

        // 計算並設定播放速率
        const targetDurationSec = barIntervalMs / 1000;
        state.speed = targetDurationSec > 0 ? state.duration / targetDurationSec : 1;

        let crossFade = 0;
        if(isCrossFade) {
            crossFade = this.crossFade;
            state.time = 0;
        }

        this.anim.crossFade(key, crossFade);
    }
}
import { _decorator, Component, Node, AudioSource, AudioClip, tween, Tween, director, Enum } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';

const { ccclass, property } = _decorator;

/**
 * 音樂類型
 */
export enum BGM_TYPE {
    LobbyBGM,

    Song_0,
    Song_1
}
Enum(BGM_TYPE);

@ccclass('BGMMataMap')
export class BGMDataMap {
    @property({ type: Enum(BGM_TYPE), tooltip: '音樂類型' })
    bgmType: BGM_TYPE = BGM_TYPE.LobbyBGM;

    @property({ type: AudioClip, tooltip: '音樂檔案' })
    clip: AudioClip = null!;
}


/**
 * 音效類型
 */
export enum SFX_TYPE {
    ButtonClick,
    CancalClick
}
Enum(SFX_TYPE);

/**
 * 音效資料
 */
@ccclass('SFXDataMap')
export class SFXDataMap {
    @property({ type: Enum(SFX_TYPE), tooltip: '音效類型' })
    sfxType: SFX_TYPE = SFX_TYPE.ButtonClick;

    @property({ type: AudioClip, tooltip: '音效檔案' })
    clip: AudioClip = null!;
}

/**
 * 音訊管理中心
 */
@ccclass('AudioManager')
export class AudioManager extends SingletonComponent<AudioManager> {
    @property(AudioSource)
    private bgmSource: AudioSource = null!;
    @property(Node)
    private sfx_pool: Node = null;

    @property({ type: [BGMDataMap], tooltip: '音樂對照表'})
    private bgmList: BGMDataMap[] = [];
    @property({ type: [SFXDataMap], tooltip: '音效對照表' })
    private sfxList: SFXDataMap[] = [];

    // BGM
    private activeBgmTween: Tween<AudioSource> | null = null;
    private bgmMap: Map<BGM_TYPE, AudioClip> = new Map();

    // SFX 物件池
    private initialSfxPoolSize: number = 5;
    private sfxPool: AudioSource[] = [];
    private sfxMap: Map<SFX_TYPE, AudioClip> = new Map();

    protected onLoad(): void {
        super.onLoad();

        this.init();
    }

    /**
     * 初始化
     */
    private init() {
        for (let i = 0; i < this.initialSfxPoolSize; i++) {
            this.createSfxSource();
        }

        for (const data of this.sfxList) {
            if (data.clip) {
                this.sfxMap.set(data.sfxType, data.clip);
            }
        }

        for (const data of this.bgmList) {
            if (data.clip) {
                this.bgmMap.set(data.bgmType, data.clip);
            }
        }
    }

    /**
     * 播放BGM
     * @param clip 
     * @param volume 
     * @param isLoop 
     * @param fadeTime 
     * @returns 
     */
    public playBGM(
        type: BGM_TYPE, 
        volume: number = 1.0, 
        isLoop: boolean = true, 
        currentTime: number = 0, 
        fadeTime: number = 0.5
    ) {
        const clip = this.bgmMap.get(type);
        if (!clip) {
            console.error(`[AudioManager] 找不到音樂類型: ${BGM_TYPE[type]}`);
            return
        }

        // 淡出舊的，淡入新的
        if (this.activeBgmTween) this.activeBgmTween.stop();

        tween(this.bgmSource)
            .to(fadeTime, { volume: 0 })
            .call(() => this.bgmSource.stop())
            .start();

        this.activeBgmTween = tween(this.bgmSource)
            .to(fadeTime, { volume: volume })
            .call(() => {
                this.bgmSource.clip = clip;
                this.bgmSource.currentTime = currentTime;
                this.bgmSource.loop = isLoop;
                this.bgmSource.play();
            })
            .start();
    }
    
    /**
     * 播放音效
     * @param type 
     * @param volume 
     * @returns 
     */
    public playSFX(type: SFX_TYPE, volume: number = 1.0) {
        const clip = this.sfxMap.get(type);
        if (!clip) {
            console.error(`[AudioManager] 找不到音效類型: ${SFX_TYPE[type]}`);
            return
        }

        const source = this.getPooledSfxSource();
        source.clip = clip;
        source.volume = volume;
        source.loop = false;
        source.play();

        // 根據音效長度，計時歸還至物件池
        this.scheduleOnce(() => {
            this.recycleSfx(source);
        }, clip.getDuration() + 0.1);
    }

    /**
     * 創建音效物件
     * @param parent
     * @returns 
     */
    private createSfxSource(): AudioSource {
        const sfxNode = new Node('SFX_Source');
        sfxNode.parent = this.sfx_pool;
        const source = sfxNode.addComponent(AudioSource);
        source.playOnAwake = false;
        
        this.sfxPool.push(source);
        return source;
    }

    /**
     * 獲取池中音效物件
     * @returns 
     */
    private getPooledSfxSource(): AudioSource {
        if (this.sfxPool.length > 0) {
            return this.sfxPool.pop()!;
        } else {
            return this.createSfxSource();
        }
    }

    /**
     * 回收音效物件
     * @param source 
     */
    private recycleSfx(source: AudioSource) {
        source.stop();
        source.clip = null;
        this.sfxPool.push(source);
    }
}
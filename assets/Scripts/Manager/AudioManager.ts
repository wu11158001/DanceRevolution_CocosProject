import { _decorator, Component, Node, AudioSource, AudioClip, tween, Tween, director, Enum, resources } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { GameTool } from '../Tools/GameTool';

const { ccclass, property } = _decorator;

/**
 * 音樂類型
 */
export enum BGM_TYPE {
    LobbyBGM = 'LobbyBGM',

    Song_0 = 'Song_0',
    Song_1 = 'Song_1'
}
Enum(BGM_TYPE);

/**
 * 音效類型 (與 resources/audio/sfx/ 檔名一致)
 */
export enum SFX_TYPE {
    ButtonClick,
    CancalClick
}
Enum(SFX_TYPE);

/**
 * 音訊管理中心
 */
@ccclass('AudioManager')
export class AudioManager extends SingletonComponent<AudioManager> {
    @property(AudioSource)
    private bgmSource: AudioSource = null!;
    @property(Node)
    private sfx_pool: Node = null;

    // SFX 物件池
    private initialSfxPoolSize: number = 5;
    private sfxPool: AudioSource[] = [];

    // 音效與音樂快取容器
    private clipCache: Map<string, AudioClip> = new Map();

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
    }

    /**
     * 音樂停止
     */
    public stopBGM() {
         this.bgmSource.stop();
    }

    /**
     * 播放BGM
     */
    public playBGM (
        type: BGM_TYPE, 
        volume: number = 1.0, 
        isLoop: boolean = true, 
        currentTime: number = 0, 
    ) {
        const bgmName = typeof type === 'number' ? BGM_TYPE[type] : String(type);

        // 若快取中已有該音樂，直接播放
        if (this.clipCache.has(bgmName)) {
            this.startPlayBGM(this.clipCache.get(bgmName)!, volume, isLoop, currentTime);
            return;
        }

        // 若快取無資源，從 resources/audio/bgm/ 動態下載並解碼
        resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.error(`[AudioManager] Web 載入音樂失敗: audio/bgm/${bgmName}`, err);
                return;
            }

            // 寫入快取並播放
            this.clipCache.set(bgmName, clip);
            this.startPlayBGM(clip, volume, isLoop, currentTime);
        });
    }

    /**
     * 開始播放BGM
     */
    private startPlayBGM (
        clip: AudioClip, 
        volume: number, 
        isLoop: boolean, 
        currentTime: number, 
    ) {
        this.bgmSource.stop();
        this.bgmSource.clip = clip;
        this.bgmSource.loop = isLoop;
        this.bgmSource.volume = volume;

        this.bgmSource.play();

        if (currentTime > 0) {
            this.bgmSource.currentTime = currentTime;
        }
    }
    
    /**
     * 播放音效 (動態從 resources/audio/sfx/ 載入並進行物件池派發)
     */
    public playSFX(type: SFX_TYPE, volume: number = 1.0) {
        // 數字 Enum 會自動反向查表取出檔名 (例如: 0 -> "ButtonClick")
        const sfxName = typeof type === 'number' ? SFX_TYPE[type] : String(type);

        if (!sfxName) {
            console.error(`[AudioManager] 音效類型解析失敗，傳入的 type 為:`, type);
            return;
        }

        // 若快取已有音效檔，直接從物件池播放
        if (this.clipCache.has(sfxName)) {
            this.startPlaySFX(this.clipCache.get(sfxName)!, volume);
            return;
        }

        // 快取無資源，動態載入音效檔
        resources.load(`audio/sfx/${sfxName}`, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.error(`[AudioManager] Web 載入音效失敗: audio/sfx/${sfxName}`, err);
                return;
            }

            this.clipCache.set(sfxName, clip);
            this.startPlaySFX(clip, volume);
        });
    }

    /**
     * 從物件池取得 AudioSource 並播放音效
     */
    private startPlaySFX(clip: AudioClip, volume: number) {
        const source = this.getPooledSfxSource();
        source.clip = clip;
        source.volume = volume;
        source.loop = false;
        source.play();

        // 根據音效長度計時歸還至物件池
        this.scheduleOnce(() => {
            this.recycleSfx(source);
        }, clip.getDuration() + 0.1);
    }

    /**
     * 創建音效物件
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
     */
    private getPooledSfxSource(): AudioSource {
        if (this.sfxPool.length > 0) {
            return this.sfxPool.pop()!;
        } else {
            return this.createSfxSource();
        }
    }

    /**
     * 獲取歌曲剩餘時間(0~1)
     */
    public getSongTimeLeftProgress(): number {
        if (!this.bgmSource || !this.bgmSource.playing) return;

        const currentTime = this.bgmSource.currentTime;
        const totalDuration = this.bgmSource.duration;

        return currentTime / totalDuration;
    }

    /**
     * 獲取歌曲剩餘時間(MM:SS)
     */
    public getSongTimeLeft(): string {
        if (!this.bgmSource || !this.bgmSource.playing) return;

        const currentTime = this.bgmSource.currentTime;
        const totalDuration = this.bgmSource.duration;

        if (totalDuration <= 0) return;

        const timeLeft = Math.max(0, totalDuration - currentTime);
        return GameTool.getInstance().formatTime(timeLeft);
    }

    /**
     * 回收音效物件
     */
    private recycleSfx(source: AudioSource) {
        source.stop();
        source.clip = null;
        this.sfxPool.push(source);
    }
}
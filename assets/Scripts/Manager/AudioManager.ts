import { _decorator, Component, Node, AudioSource, AudioClip, tween, Tween, director, Enum, resources } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { GameTool } from '../Tools/GameTool';
import { ISongData } from '../Data/RoomData';

const { ccclass, property } = _decorator;

/**
 * 音效類型 (與 resources/audio/sfx/ 檔名一致)
 */
export enum SFX_TYPE {
    ButtonClick,
    CancelClick,

    BeatPerfect,
    BeatNromal,
    BeatMiss,

    Cheer,
    Ready,

    None
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

    // 試聽控制
    private isPreviewing: boolean = false;
    private previewStartTime: number = 0;
    private previewEndTime: number = 0;
    private bgmTween: Tween<AudioSource> = null;

    protected onLoad(): void {
        super.onLoad();

        this.init();
    }

    protected update(dt: number): void {
        this.previewing();
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
     * 預載 BGM 資源
     */
    public preloadBGM(bgmName: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.clipCache.has(bgmName)) {
                resolve(true);
                return;
            }

            resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
                if (err || !clip) {
                    console.error(`[AudioManager] 預載 BGM 失敗: audio/bgm/${bgmName}`, err);
                    resolve(false);
                    return;
                }
                this.clipCache.set(bgmName, clip);
                resolve(true);
            });
        });
    }

    /**
     * 預載 SFX 資源
     */
    public preloadSFX(type: SFX_TYPE): Promise<boolean> {
        return new Promise((resolve) => {
            const sfxName = typeof type === 'number' ? SFX_TYPE[type] : String(type);
            if (this.clipCache.has(sfxName)) {
                resolve(true);
                return;
            }

            resources.load(`audio/sfx/${sfxName}`, AudioClip, (err, clip) => {
                if (err || !clip) {
                    console.error(`[AudioManager] 預載 SFX 失敗: audio/sfx/${sfxName}`, err);
                    resolve(false);
                    return;
                }
                this.clipCache.set(sfxName, clip);
                resolve(true);
            });
        });
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
    public playBGM(
        bgmName: string, 
        volume: number = 0.85, 
        isLoop: boolean = true, 
        currentTime: number = 0, 
    ) {
        if (this.clipCache.has(bgmName)) {
            this.startPlayBGM(this.clipCache.get(bgmName)!, volume, isLoop, currentTime);
            return;
        }

        // 防禦性處理：若未預載成功，上記錄開始載入的時間點，載入完畢後自動扣除下載耗時
        const loadStartTime = Date.now();

        resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.error(`[AudioManager] Web 載入音樂失敗: audio/bgm/${bgmName}`, err);
                return;
            }

            this.clipCache.set(bgmName, clip);
            
            // 補償因為下載/解碼所消耗的時間
            const loadDurationSec = (Date.now() - loadStartTime) / 1000;
            const adjustedTime = currentTime + loadDurationSec;

            this.startPlayBGM(clip, volume, isLoop, adjustedTime);
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
        this.isPreviewing = false

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
    public playSFX(type: SFX_TYPE, volume: number = 0.65) {
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
     * 試聽音樂監控
     */
    private previewing() {
    if (this.isPreviewing && this.bgmSource && this.bgmSource.playing) {
        // 確保不會超出音訊總長度
        const duration = this.bgmSource.duration;
        const targetEndTime = Math.min(this.previewEndTime, duration);

        // 超過試聽區間，跳回 preview_start 重新循環
        if (this.bgmSource.currentTime >= targetEndTime) {
            this.bgmSource.currentTime = Math.min(this.previewStartTime, duration);
        }
    }
}

    /**
     * 播放試聽歌曲
     */
    public playSongPreview(songData: ISongData) {
        if (!songData) return;

        const bgmName = songData.id;
        this.previewStartTime = songData.preview_start || 10;
        const duration = songData.preview_duration || 15;
        this.previewEndTime = this.previewStartTime + duration;

        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        const startPreviewLoop = (clip: AudioClip) => {
            this.isPreviewing = true;
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
            this.bgmSource.loop = true;
            this.bgmSource.currentTime = this.previewStartTime;
            this.bgmSource.volume = 0;
            this.bgmSource.play();

            // 音樂淡入
            this.bgmTween = tween(this.bgmSource)
                .to(0.3, { volume: 0.85 })
                .start();
        };

        // 先淡出當前音樂，再播放新試聽
        this.fadeBGM(0.2, 0, () => {
            if (this.clipCache.has(bgmName)) {
                startPreviewLoop(this.clipCache.get(bgmName)!);
            } else {
                resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
                    if (err || !clip) {
                        console.error(`[AudioManager] 載入試聽音樂失敗: audio/bgm/${bgmName}`, err);
                        return;
                    }
                    this.clipCache.set(bgmName, clip);
                    startPreviewLoop(clip);
                });
            }
        });
    }

    /**
     * 停止試聽
     * @param restoreLobbyBGM 是否恢復大廳背景音樂
     */
    public stopSongPreview(restoreLobbyBGM: boolean = true) {
        if (!this.isPreviewing) return;

        this.isPreviewing = false;

        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        // 淡出當前試聽
        this.bgmTween = tween(this.bgmSource)
            .to(0.3, { volume: 0 })
            .call(() => {
                this.bgmSource.stop();
                if (restoreLobbyBGM) {
                    // 播放大廳 BGM
                    this.playBGM('LobbyBGM', 1.0, true);
                }
            })
            .start();
    }

    /**
     * 通用 BGM 音量淡入淡出工具
     */
    private fadeBGM(duration: number, targetVolume: number, onComplete?: Function) {
        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        if (!this.bgmSource.playing) {
            if (onComplete) onComplete();
            return;
        }

        this.bgmTween = tween(this.bgmSource)
            .to(duration, { volume: targetVolume })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
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
import { _decorator, Component, Node, AudioSource, AudioClip, tween, Tween, director, Enum, resources } from 'cc';

import { SingletonComponent } from 'db://assets/Scripts/Extensions/SingletonComponent';
import { GameTool } from '../Tools/GameTool';
import { ISongData } from '../Data/RoomData';

const { ccclass, property } = _decorator;

/**
 * 音效類型枚舉
 */
export enum SFX_TYPE {
    ButtonClick,    // 按鈕點擊音效
    CancelClick,    // 取消按鈕音效

    BeatPerfect,    // Perfect 判定音效
    BeatNromal,     // Normal 判定音效
    BeatMiss,       // Miss 判定音效

    Cheer,          // 歡呼音效
    Ready,          // 準備音效

    None            // 無音效（佔位符）
}
Enum(SFX_TYPE);

/**
 * 音訊管理中心（單例模式）
 */
@ccclass('AudioManager')
export class AudioManager extends SingletonComponent<AudioManager> {
    @property(AudioSource)
    private bgmSource: AudioSource = null!;
    @property(Node)
    private sfx_pool: Node = null;
    
    /**
     * 物件池初始大小
     */
    private readonly initialSfxPoolSize: number = 5;
    
    /**
     * 音效源物件池
     */
    private sfxPool: AudioSource[] = [];

    /**
     * 音訊資源快取容器
     */
    private clipCache: Map<string, AudioClip> = new Map();

    /**
     * 試聽模式標記
     * true 表示正在試聽歌曲
     */
    private isPreviewing: boolean = false;
    
    /**
     * 試聽片段起始時間（秒）
     */
    private previewStartTime: number = 0;
    
    /**
     * 試聽片段結束時間（秒）
     */
    private previewEndTime: number = 0;
    
    /**
     * BGM 音量控制 Tween
     * 用於實現平滑的音量淡入淡出效果
     */
    private bgmTween: Tween<AudioSource> | null = null;

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
    private init(): void {
        for (let i = 0; i < this.initialSfxPoolSize; i++) {
            this.createSfxSource();
        }
    }

    /**
     * 預載 BGM 資源
     * @param bgmName BGM 檔案名稱
     * @returns Promise<boolean> 載入是否成功
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
     * @param type 音效類型枚舉
     * @returns Promise<boolean> 載入是否成功
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
     * 停止 BGM 播放
     */
    public stopBGM(): void {
        this.bgmSource.stop();
    }

    /**
     * 播放 BGM
     * @param bgmName BGM 檔案名稱
     * @param volume 音量（0.0 ~ 1.0）
     * @param isLoop 是否循環播放
     * @param currentTime 起始播放時間（秒）
     */
    public playBGM(
        bgmName: string, 
        volume: number = 0.85, 
        isLoop: boolean = true, 
        currentTime: number = 0
    ): void {
        if (this.clipCache.has(bgmName)) {
            this.startPlayBGM(this.clipCache.get(bgmName)!, volume, isLoop, currentTime);
            return;
        }

        // 未預載時即時載入
        // 記錄開始載入的時間點，用於後續補償
        const loadStartTime = Date.now();

        resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.error(`[AudioManager] 即時載入 BGM 失敗: audio/bgm/${bgmName}`, err);
                return;
            }

            this.clipCache.set(bgmName, clip);

            // 確保多人遊戲中音樂同步
            const loadDurationSec = (Date.now() - loadStartTime) / 1000;
            const adjustedTime = currentTime + loadDurationSec;

            this.startPlayBGM(clip, volume, isLoop, adjustedTime);
        });
    }
    
    /**
     * 開始播放 BGM（內部方法）
     * @param clip 音訊資源
     * @param volume 音量
     * @param isLoop 是否循環
     * @param currentTime 起始時間
     */
    private startPlayBGM(
        clip: AudioClip, 
        volume: number, 
        isLoop: boolean, 
        currentTime: number
    ): void {
        // 退出試聽模式
        this.isPreviewing = false;

        // 停止當前播放的 BGM
        this.bgmSource.stop();
        
        // 設定新的 BGM
        this.bgmSource.clip = clip;
        this.bgmSource.loop = isLoop;
        this.bgmSource.volume = volume;

        // 開始播放
        this.bgmSource.play();

        // 僅在需要時設定播放位置
        if (currentTime > 0) {
            this.bgmSource.currentTime = currentTime;
        }
    }

    /**
     * 播放音效
     * @param type 音效類型
     * @param volume 音量（0.0 ~ 1.0）
     */
    public playSFX(type: SFX_TYPE, volume: number = 0.65): void {
        const sfxName = typeof type === 'number' ? SFX_TYPE[type] : String(type);

        if (!sfxName) {
            console.error(`[AudioManager] 音效類型解析失敗，傳入的 type 為:`, type);
            return;
        }

        if (this.clipCache.has(sfxName)) {
            this.startPlaySFX(this.clipCache.get(sfxName)!, volume);
            return;
        }

        resources.load(`audio/sfx/${sfxName}`, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.error(`[AudioManager] 即時載入 SFX 失敗: audio/sfx/${sfxName}`, err);
                return;
            }

            this.clipCache.set(sfxName, clip);
            this.startPlaySFX(clip, volume);
        });
    }

    /**
     * 播放音效
     * @param clip 音訊資源
     * @param volume 音量
     */
    private startPlaySFX(clip: AudioClip, volume: number): void {
        const source = this.getPooledSfxSource();
        
        // 設定並播放
        source.clip = clip;
        source.volume = volume;
        source.loop = false;
        source.play();

        // 音效播放完畢後歸還到物件池
        this.scheduleOnce(() => {
            this.recycleSfx(source);
        }, clip.getDuration() + 0.1);  // 多加 0.1 秒確保播放完畢
    }

    /**
     * 創建新的音效源
     * @returns 新創建的 AudioSource
     */
    private createSfxSource(): AudioSource {
        const sfxNode = new Node('SFX_Source');
        sfxNode.parent = this.sfx_pool;
        const source = sfxNode.addComponent(AudioSource);
        source.playOnAwake = false;
        
        // 加入物件池
        this.sfxPool.push(source);
        return source;
    }

    /**
     * 從物件池獲取音效源
     * @returns AudioSource 實例
     */
    private getPooledSfxSource(): AudioSource {
        if (this.sfxPool.length > 0) {
            return this.sfxPool.pop()!;
        } else {
            return this.createSfxSource();
        }
    }

    /**
     * 回收音效源到物件池
     * @param source 要回收的 AudioSource
     */
    private recycleSfx(source: AudioSource): void {
        source.stop();
        source.clip = null;
        
        // 歸還到物件池
        this.sfxPool.push(source);
    }

    /**
     * 試聽模式監控（在 update 中呼叫）
     */
    private previewing(): void {
        if (!this.isPreviewing || !this.bgmSource || !this.bgmSource.playing) {
            return;
        }

        // 獲取音訊總長度
        const duration = this.bgmSource.duration;
        // 確保結束時間不超出音訊總長度
        const targetEndTime = Math.min(this.previewEndTime, duration);

        // 檢查是否超出試聽區間
        if (this.bgmSource.currentTime >= targetEndTime) {
            // 跳回試聽起點，實現循環
            this.bgmSource.currentTime = Math.min(this.previewStartTime, duration);
        }
    }

    /**
     * 播放試聽歌曲
     * @param songData 歌曲資料
     */
    public playSongPreview(songData: ISongData): void {
        if (!songData) return;

        // 解析試聽參數
        const bgmName = songData.id;
        this.previewStartTime = songData.preview_start || 10;      // 預設從 10 秒開始
        const duration = songData.preview_duration || 15;          // 預設試聽 15 秒
        this.previewEndTime = this.previewStartTime + duration;

        // 停止之前的淡入淡出動畫
        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        // 標記進入試聽狀態
        this.isPreviewing = true;

        /**
         * 開始試聽循環播放（內部函數）
         * @param clip 音訊資源
         */
        const startPreviewLoop = (clip: AudioClip) => {
            // 如果非同步載入期間外部呼叫了 stopSongPreview (isPreviewing 被設為 false)，則不播放
            if (!this.isPreviewing) return;
            
            // 設定 AudioSource
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
            this.bgmSource.loop = true;
            this.bgmSource.currentTime = this.previewStartTime;
            this.bgmSource.volume = 0;
            this.bgmSource.play();

            // 音樂淡入效果
            this.bgmTween = tween(this.bgmSource)
                .to(0.3, { volume: 0.85 })
                .start();
        };

        // 先淡出當前音樂，再播放新試聽
        this.fadeBGM(0.2, 0, () => {
            // 如果在淡出過程中已經取消試聽，直接中斷
            if (!this.isPreviewing) return;

            // 淡出完成後的回調
            if (this.clipCache.has(bgmName)) {
                startPreviewLoop(this.clipCache.get(bgmName)!);
            } else {
                resources.load(`audio/bgm/${bgmName}`, AudioClip, (err, clip) => {
                    // 如果載入完成時玩家已關閉介面，中止播放
                    if (!this.isPreviewing) return;

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
    public stopSongPreview(restoreLobbyBGM: boolean = true): void {
        if (!this.isPreviewing) return;

        this.isPreviewing = false;

        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        // 淡出當前試聽音樂
        this.bgmTween = tween(this.bgmSource)
            .to(0.3, { volume: 0 })
            .call(() => {
                // 淡出完成後停止播放
                this.bgmSource.stop();
                
                // 恢復大廳 BGM
                if (restoreLobbyBGM) {
                    this.playBGM('LobbyBGM', 1.0, true);
                }
            })
            .start();
    }

    /**
     * 通用 BGM 音量淡入淡出工具
     * @param duration 淡入淡出時間（秒）
     * @param targetVolume 目標音量（0.0 ~ 1.0）
     * @param onComplete 完成回調
     */
    private fadeBGM(duration: number, targetVolume: number, onComplete?: Function): void {
        if (this.bgmTween) {
            this.bgmTween.stop();
        }

        // 未播放時直接執行回調
        if (!this.bgmSource.playing) {
            if (onComplete) onComplete();
            return;
        }

        // 執行淡入淡出動畫
        this.bgmTween = tween(this.bgmSource)
            .to(duration, { volume: targetVolume })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }

    /**
     * 獲取歌曲剩餘時間進度（0~1）
     * @returns 播放進度（0.0 ~ 1.0）
     */
    public getSongTimeLeftProgress(): number | undefined {
        // 防禦性檢查
        if (!this.bgmSource || !this.bgmSource.playing) return undefined;

        const currentTime = this.bgmSource.currentTime;
        const totalDuration = this.bgmSource.duration;

        return currentTime / totalDuration;
    }

    /**
     * 獲取歌曲剩餘時間（MM:SS 格式）
     * @returns 格式化的剩餘時間字串
     */
    public getSongTimeLeft(): string | undefined {
        if (!this.bgmSource || !this.bgmSource.playing) return undefined;

        const currentTime = this.bgmSource.currentTime;
        const totalDuration = this.bgmSource.duration;

        if (totalDuration <= 0) return undefined;

        // 計算剩餘時間
        const timeLeft = Math.max(0, totalDuration - currentTime);
        return GameTool.getInstance().formatTime(timeLeft);
    }
}
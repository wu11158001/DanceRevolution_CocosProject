import { 
    _decorator, Component, instantiate, Node, Sprite, SpriteFrame, UITransform, Vec3, math,
    input, Input, EventKeyboard, KeyCode, Color, tween, Tween, color, Button
} from 'cc';

import { BaseView } from '../BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { GameManager, INoteSequenceData} from 'db://assets/Scripts/Manager/GameManager';
import { GameTool } from '../../Tools/GameTool';

const { ccclass, property } = _decorator;

/**
 * 打擊譜面介面
 */
@ccclass('HitNodeView')
export class HitNodeView extends BaseView {
    @property(Sprite)
    private sprite_beatBar: Sprite = null;
    @property(Node)
    private cursor: Node = null;
    @property(Sprite)
    private sprite_hitZone: Sprite = null;
    @property({ tooltip: "打擊點位於背景條的比例 (0.8 代表 80% 位置)" })
    private hitRatio: number = 0.75;

    @property(Sprite)
    private sprite_nodeBar: Sprite = null;
    @property(Node)
    private nodeArrowPrefab: Node = null;
    @property([SpriteFrame])
    private nodeArrowSprites: SpriteFrame[] = []; // [0]: 預設/未按 , [1]: 正確按壓

    @property([Button])
    private phoneBtns: Button[] = [];   // 手機專用按鈕(0=上,1=下,2=左,3=右,4=打擊)

    private barWidth: number = 0;
    private barStartTime: number = 0;
    private barIntervalMs: number = 0;
    private beatIntervalMs: number = 0; // 單拍毫秒數
    private targetHitTime: number = 0;
    private isRunning: boolean = false;

    private nodeArrows: Sprite[] = [];
    private currentSequence: string[] = []; // 當前小節的箭頭順序
    private currentInputIndex: number = 0;   // 當前輸入到第幾個箭頭
    private currentProgress: number = 0;     // 當前進度 (0.0 ~ 1.0)

    protected onEnable(): void {
        // 註冊鍵盤監聽
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    protected onDisable(): void {
        // 取消鍵盤監聽
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        // 初始化手機專用按鈕
        this.initPhoneButtons();

        this.sprite_nodeBar.node.active = false;
        this.nodeArrowPrefab.active = false;

        const transform = this.sprite_beatBar.getComponent(UITransform);
        this.barWidth = transform ? transform.width : 320;
        const hitZoneX = this.barWidth * this.hitRatio;
        this.sprite_hitZone.node.setPosition(new Vec3(hitZoneX, 0, 0));
        this.cursor.setPosition(new Vec3(0, 0, 0));
        this.sprite_beatBar.node.active = false;
    }

    /**
     * 初始化手機 UI 按鈕綁定
     */
    private initPhoneButtons() {
        const isMobile = GameTool.getInstance().isMobileBrowser();
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

        this.phoneBtns.forEach((btn, index) => {
            if (!btn) return;

            // 僅在手機網頁顯示按鈕
            btn.node.active = isMobile;

            btn.node.off(Node.EventType.TOUCH_START);

            if (index < 4) {
                // 0:UP, 1:DOWN, 2:LEFT, 3:RIGHT
                const dir = directions[index];
                btn.node.on(Node.EventType.TOUCH_START, () => {
                    this.handleDirectionInput(dir);
                }, this);
            } else if (index === 4) {
                // 4:打擊 (Space)
                btn.node.on(Node.EventType.TOUCH_START, () => {
                    this.onSpaceHit();
                }, this);
            }
        });
    }

    protected update(deltaTime: number) {
        if (!this.isRunning || this.barIntervalMs <= 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        // 計算當前進度並記錄到全域變數
        this.currentProgress = (currentServerTime - this.barStartTime) / this.barIntervalMs;
        
        const currentX = math.clamp01(this.currentProgress) * this.barWidth;
        this.cursor.setPosition(new Vec3(currentX, 0, 0));

        // 依據節拍更新 hitZone 的 Alpha
        this.updateHitZoneAlpha(currentServerTime);

        // 未打擊 (超過當前小節時間)
        if (this.currentProgress >= 1.0) {
            this.resetState();
        }
    }

    /**
     * 計算並更新 HitZone 依照節拍的 Alpha 變化
     */
    private updateHitZoneAlpha(currentServerTime: number) {
        if (!this.sprite_hitZone || this.beatIntervalMs <= 0) return;

        const elapsedTime = currentServerTime - this.barStartTime;
        const beatProgress = (elapsedTime % this.beatIntervalMs) / this.beatIntervalMs;

        const minAlpha = 180;
        const maxAlpha = 255;
        const alphaRange = (maxAlpha - minAlpha) / 2;
        const centerAlpha = minAlpha + alphaRange;

        const calculatedAlpha = centerAlpha + alphaRange * Math.cos(beatProgress * Math.PI * 2);

        const color = this.sprite_hitZone.color;
        this.sprite_hitZone.color = new Color(color.r, color.g, color.b, math.clamp(calculatedAlpha, minAlpha, maxAlpha));
    }

    /**
     * 重置狀態與復原組件屬性
     */
    private resetState() {
        this.isRunning = false;

        if (this.sprite_beatBar) {
            this.sprite_beatBar.node.active = false;
            const c = this.sprite_beatBar.color;
            this.sprite_beatBar.color = new Color(c.r, c.g, c.b, 255);
        }

        if (this.sprite_nodeBar) {
            this.sprite_nodeBar.node.active = false;
            const c = this.sprite_nodeBar.color;
            this.sprite_nodeBar.color = new Color(c.r, c.g, c.b, 255);
        }

        if (this.sprite_hitZone) {
            this.sprite_hitZone.node.setScale(new Vec3(1, 1, 1));
            const color = this.sprite_hitZone.color;
            this.sprite_hitZone.color = new Color(color.r, color.g, color.b, 255);
        }

        this.currentInputIndex = 0;
        this.currentSequence = [];
    }

    /**
     * 接收到資料
     */
    public reciveData(data: INoteSequenceData) {
        this.resetState();

        this.targetHitTime = data.targetHitTime;
        this.barIntervalMs = data.barIntervalMs || (data.beatIntervalMs * 4);
        this.beatIntervalMs = data.beatIntervalMs || (this.barIntervalMs / 4);

        this.sprite_beatBar.node.active = true;
        this.barStartTime = this.targetHitTime - (this.barIntervalMs * this.hitRatio);
        this.isRunning = true;

        this.showCurrentNode(data.sequence);
    }

    /**
     * 顯示當前譜面
     */
    public showCurrentNode(sequence: string[]) {
        this.currentSequence = sequence;
        this.currentInputIndex = 0;

        // 移除舊譜面
        this.nodeArrows.forEach((nodeArrow) => {
            if (nodeArrow && nodeArrow.node) {
                nodeArrow.node.destroy();
            }
        });
        this.nodeArrows = [];

        this.sprite_nodeBar.node.active = true;

        // 產生新譜面
        sequence.forEach((sequenceString) => {
            let obj = instantiate(this.nodeArrowPrefab);
            obj.active = true;
            obj.setParent(this.sprite_nodeBar.node);

            let sp = obj.getComponent(Sprite);
            if (sp && this.nodeArrowSprites.length > 0) {
                sp.spriteFrame = this.nodeArrowSprites[0];
                sp.color = new Color(255, 255, 255, 255);
            }

            let angle = 0;
            switch (sequenceString) {
                case 'UP': angle = 0; break;
                case 'DOWN': angle = 180; break;
                case 'LEFT': angle = 90; break;
                case 'RIGHT': angle = 270; break;
            }

            obj.angle = angle;
            if (sp) this.nodeArrows.push(sp);
        });
    }

    /**
     * 鍵盤輸入事件處理
     */
    private onKeyDown(event: EventKeyboard) {
        if (!this.isRunning) return;

        // 空白鍵處理 (Space)
        if (event.keyCode === KeyCode.SPACE) {
            this.onSpaceHit();
            return;
        }

        // 判斷的方向鍵
        let pressedDirection: string | null = null;
        switch (event.keyCode) {
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W:
                pressedDirection = 'UP';
                break;
            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S:
                pressedDirection = 'DOWN';
                break;
            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A:
                pressedDirection = 'LEFT';
                break;
            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D:
                pressedDirection = 'RIGHT';
                break;
        }

        if (pressedDirection) {
            this.handleDirectionInput(pressedDirection);
        }
    }

    /**
     * 處理方向鍵輸入 (鍵盤與手機按鈕共用)
     */
    private handleDirectionInput(pressedDirection: string) {
        if (!this.isRunning) return;

        // 如果箭頭已經全部輸入完成，忽視多餘的方向輸入
        if (this.currentInputIndex >= this.currentSequence.length) return;

        // 比對當前位置的箭頭方向
        const targetDirection = this.currentSequence[this.currentInputIndex];

        if (pressedDirection === targetDirection) {
            const currentArrow = this.nodeArrows[this.currentInputIndex];
            if (currentArrow) {
                Tween.stopAllByTarget(currentArrow.node);

                const startColor = currentArrow.color.clone();
                const black = new Color(0, 0, 0, 255);
                const white = new Color(255, 255, 255, 255);

                tween(currentArrow.node)
                    .to(0.1, {}, {
                        onUpdate: (target, ratio) => {
                            let r = math.lerp(startColor.r, black.r, ratio);
                            let g = math.lerp(startColor.g, black.g, ratio);
                            let b = math.lerp(startColor.b, black.b, ratio);
                            currentArrow.color = new Color(r, g, b, 255);
                        }
                    })
                    .call(() => {
                        if (this.nodeArrowSprites[1]) {
                            currentArrow.spriteFrame = this.nodeArrowSprites[1];
                        }
                    })
                    .to(0.1, {}, {
                        onUpdate: (target, ratio) => {
                            let r = math.lerp(black.r, white.r, ratio);
                            let g = math.lerp(black.g, white.g, ratio);
                            let b = math.lerp(black.b, white.b, ratio);
                            currentArrow.color = new Color(r, g, b, 255);
                        }
                    })
                    .start();
            }
            this.currentInputIndex++;
        } else {
            // 停止所有箭頭 Node 上的 running Tween
            this.nodeArrows.forEach((currentArrow) => {
                if (currentArrow && currentArrow.node) {
                    Tween.stopAllByTarget(currentArrow.node);
                }
            });

            // 執行重置
            this.resetInputSequence();
        }
    }

    /**
     * 輸入錯誤時重置所有箭頭狀態
     */
    private resetInputSequence() {
        this.currentInputIndex = 0;
        this.nodeArrows.forEach((sp) => {
            if (sp && this.nodeArrowSprites[0]) {
                tween(sp.node).stop();
                sp.color = new Color(255, 255, 255, 255);
                sp.spriteFrame = this.nodeArrowSprites[0];
            }
        });
    }

    /**
     * 按下 Space / 打擊鈕觸發
     */
    private onSpaceHit() {
        // 進度小於 50% || 沒有任何正確
        if (this.currentProgress < 0.5 || this.currentInputIndex === 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();

        // 發送給 Server 判定
        SocketManager.getInstance().sendPlayerHit({
            hitTime: currentServerTime,                 // 校正時間
            completedCount: this.currentInputIndex,     // 正確輸入的箭頭數量
            sequenceLength: this.currentSequence.length // 總箭頭數
        });

        // 停止打擊判定 logic
        this.isRunning = false;

        // sprite_hitZone 寬度放大
        if (this.sprite_hitZone) {
            tween(this.sprite_hitZone.node)
                .to(0.2, { scale: new Vec3(1.5, 1, 1) })
                .start();
        }

        // sprite_beatBar 與 sprite_nodeBar 淡出至 Alpha 0 後隱藏
        let fadeCompletedCount = 0;
        const onFadeComplete = () => {
            fadeCompletedCount++;
            if (fadeCompletedCount >= 2) {
                this.resetState();
            }
        };

        const fadeOutSprite = (sprite: Sprite) => {
            if (!sprite || !sprite.node.active) {
                onFadeComplete();
                return;
            }
            const curColor = sprite.color;
            tween(sprite)
                .to(0.35, { color: new Color(curColor.r, curColor.g, curColor.b, 0) })
                .call(() => onFadeComplete())
                .start();
        };

        fadeOutSprite(this.sprite_beatBar);
        fadeOutSprite(this.sprite_nodeBar);
    }
}
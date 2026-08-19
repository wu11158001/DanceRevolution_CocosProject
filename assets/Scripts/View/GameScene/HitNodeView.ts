import { 
    _decorator, Component, instantiate, Node, Sprite, SpriteFrame, UITransform, Vec3, math,
    input, Input, EventKeyboard, KeyCode, Color, tween, Tween, color, Button
} from 'cc';

import { BaseView } from '../BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { GameManager, INoteSequenceData, ISequenceData} from 'db://assets/Scripts/Manager/GameManager';
import { GameTool } from '../../Tools/GameTool';
import { DIFFICULTY_TYPE, RoomData } from '../../Data/RoomData';

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
    private nodeArrowSprites: SpriteFrame[] = []; // [0]: 一般/未按, [1]:反向/未按, [2]:按壓的效果, [3]: 正確按壓

    @property([Button])
    private phoneBtns: Button[] = [];   // 手機專用按鈕(0=上,1=下,2=左,3=右,4=打擊)
    @property(Node)
    private reversPhoneBtnsNode: Node = null

    private barWidth: number = 0;
    private barStartTime: number = 0;
    private barIntervalMs: number = 0;
    private beatIntervalMs: number = 0; // 單拍毫秒數
    private targetHitTime: number = 0;
    private isRunning: boolean = false;

    private nodeArrows: Sprite[] = [];
    private currentSequence: ISequenceData[] = [];  // 當前小節的箭頭順序
    private currentInputIndex: number = 0;          // 當前輸入到第幾個箭頭
    private currentProgress: number = 0;            // 當前進度 (0.0 ~ 1.0)
    private pressedKeys: Set<number> = new Set();   // 紀錄鍵盤按壓按鍵

    private bufferTimer: any = null;
    private readonly BUFFER_DELAY_MS: number = 35;  // 判定容錯


    protected onEnable(): void {
        // 註冊鍵盤監聽
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDisable(): void {
        // 取消鍵盤監聽
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
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
        // 手機按鈕:簡單以外的才顯示協方向
        this.reversPhoneBtnsNode.active = RoomData.difficulty === DIFFICULTY_TYPE.EASY;

        const isMobile = GameTool.getInstance().isMobileBrowser();
        const directions = ['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'UP_LEFT', 'UP_RIGHT', 'DOWN_LEFT', 'DOWN_RIGHT'];

        this.phoneBtns.forEach((btn, index) => {
            if (!btn) return;

            // 僅在手機網頁顯示按鈕
            btn.node.active = isMobile;

            btn.node.off(Node.EventType.TOUCH_START);

            if (index == 0) {
                // 打擊
                btn.node.on(Node.EventType.TOUCH_START, () => {
                    this.onSpaceHit();
                }, this);
                
            } else {
                // 方向鍵
                const dir = directions[index];
                btn.node.on(Node.EventType.TOUCH_START, () => {
                    this.handleDirectionInput(dir);
                }, this);
            }
        });
    }

    protected update(deltaTime: number) {
        if (!this.isRunning || this.barIntervalMs <= 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        // 計算當前進度 (0.0 代表小節開頭第 1 拍，0.75 代表 Hit Zone 第 4 拍，1.0 代表小節結束)
        this.currentProgress = (currentServerTime - this.barStartTime) / this.barIntervalMs;
        
        // clamp01 確保游標不會超出範圍
        const clampedProgress = math.clamp01(this.currentProgress);
        const currentX = clampedProgress * this.barWidth;
        this.cursor.setPosition(new Vec3(currentX, 0, 0));

        // 依據節拍更新 hitZone 的 Alpha
        this.updateHitZoneAlpha(currentServerTime);

        // 當前小節結束 (到達 100% 尾端)
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
     * 重置狀態
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

        // 當 targetHitTime 為第 4 拍 (75% 位置) 時：
        // barStartTime 會剛好等於 currentBarStartTime (第 1 拍)
        this.barStartTime = this.targetHitTime - (this.barIntervalMs * this.hitRatio);
        this.isRunning = true;

        this.showCurrentNode(data.sequence);
    }

    /**
     * 顯示當前譜面
     */
    public showCurrentNode(datas: ISequenceData[]) {
        this.currentSequence = datas;
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
        datas.forEach((data) => {
            let obj = instantiate(this.nodeArrowPrefab);
            obj.active = true;
            obj.setParent(this.sprite_nodeBar.node);

            let sp = obj.getComponent(Sprite);
            this.setArrow(data, sp);
            
            if (sp) this.nodeArrows.push(sp);
        });
    }

    /**
     * 設置箭頭
     */
    private setArrow(data: ISequenceData, sp: Sprite) {
        if (sp) {
            if(data.isReversed) { 
                sp.spriteFrame = this.nodeArrowSprites[1];
            } else {
                sp.spriteFrame = this.nodeArrowSprites[0];
            }

            sp.color = new Color(255, 255, 255, 255);
        }

        let angle = 0;
        switch (data.direction) {
            case 'UP': angle = !data.isReversed ? 0 : 180; break;
            case 'DOWN': angle = !data.isReversed ? 180 : 0; break;
            case 'LEFT': angle = !data.isReversed ? 90 : -90; break;
            case 'RIGHT': angle = !data.isReversed ? 270 : -270; break;
            case 'UP_LEFT' : angle = !data.isReversed ? 45 : -135; break;
            case 'UP_RIGHT' : angle = !data.isReversed ? -45 : 135; break;
            case 'DOWN_RIGHT' : angle = !data.isReversed ? -135 : -45; break;
            case 'DOWN_LEFT' : angle = !data.isReversed ? 135 : 45; break;
        }

        sp.node.angle = angle;
    }

    /**
     * 鍵盤輸入(按壓)
     */
    private onKeyDown(event: EventKeyboard) {
        // 打擊
        if(event.keyCode == KeyCode.SPACE) {
            this.onSpaceHit();
            return;
        }

        // 如果按下的鍵本來就在 Set 裡 (例如按著不放引發的連續 repeat 事件)，直接忽略
        if (this.pressedKeys.has(event.keyCode)) return;

        this.pressedKeys.add(event.keyCode);

        // 如果原本有在等待判定，先清除，重新重設緩衝計時
        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
        }

        // 如果直接按下數字小鍵盤的單鍵斜向 (7, 9, 1, 3)，直接觸發
        if (this.isSingleDiagonalKey(event.keyCode)) {
            this.resolveInput();
            return;
        }

        // 延遲等待第二個按鍵落下的可能
        this.bufferTimer = setTimeout(() => {
            this.resolveInput();
        }, this.BUFFER_DELAY_MS);
    }

    /**
     * 鍵盤輸入(方開)
     * @param event 
     */
    private onKeyUp(event: EventKeyboard) {
        this.pressedKeys.delete(event.keyCode);
    }

    /**
     * 緩衝時間到，進行最終方向結算並發送輸入
     */
    private resolveInput() {
        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
            this.bufferTimer = null;
        }

        const finalDirection = this.calculateDirection();
        this.handleDirectionInput(finalDirection)

        this.pressedKeys.clear(); 
    }

    /**
     * 斜角按鍵
     * @param code 
     * @returns 
     */
    private isSingleDiagonalKey(code: number): boolean {
        return code === KeyCode.NUM_7 || code === KeyCode.NUM_9 || 
               code === KeyCode.NUM_1 || code === KeyCode.NUM_3;
    }

    /**
     * 按鍵方向
     */
    private calculateDirection(): string | null {
        // 檢查基礎 4 個方向
        const isUp = this.pressedKeys.has(KeyCode.ARROW_UP) || this.pressedKeys.has(KeyCode.KEY_W) || this.pressedKeys.has(KeyCode.NUM_8);
        const isDown = this.pressedKeys.has(KeyCode.ARROW_DOWN) || this.pressedKeys.has(KeyCode.KEY_S) || this.pressedKeys.has(KeyCode.NUM_2);
        const isLeft = this.pressedKeys.has(KeyCode.ARROW_LEFT) || this.pressedKeys.has(KeyCode.KEY_A) || this.pressedKeys.has(KeyCode.NUM_4);
        const isRight = this.pressedKeys.has(KeyCode.ARROW_RIGHT) || this.pressedKeys.has(KeyCode.KEY_D) || this.pressedKeys.has(KeyCode.NUM_6);

        // 判斷 4 個斜角組合 (組合鍵)
        if (isUp && isLeft) return 'UP_LEFT';
        if (isUp && isRight) return 'UP_RIGHT';
        if (isDown && isLeft) return 'DOWN_LEFT';
        if (isDown && isRight) return 'DOWN_RIGHT';

        // 斜角
        if (this.pressedKeys.has(KeyCode.NUM_7)) return 'UP_LEFT';
        if (this.pressedKeys.has(KeyCode.NUM_9)) return 'UP_RIGHT';
        if (this.pressedKeys.has(KeyCode.NUM_1)) return 'DOWN_LEFT';
        if (this.pressedKeys.has(KeyCode.NUM_3)) return 'DOWN_RIGHT';

        // 單一方向
        if (isUp) return 'UP';
        if (isDown) return 'DOWN';
        if (isLeft) return 'LEFT';
        if (isRight) return 'RIGHT';

        return null;
    }

    /**
     * 處理方向鍵輸入
     */
    private handleDirectionInput(pressedDirection: string) {
        if (!this.isRunning) return;

        // 如果箭頭已經全部輸入完成，忽視多餘的方向輸入
        if (this.currentInputIndex >= this.currentSequence.length) return;

        const data = this.currentSequence[this.currentInputIndex];

        // 比對當前位置的箭頭方向
        const targetDirection = data.direction;

        // 正確輸入
        if (pressedDirection === targetDirection) {
            const currentArrow = this.nodeArrows[this.currentInputIndex];
            if (currentArrow) {
                Tween.stopAllByTarget(currentArrow.node);

                currentArrow.spriteFrame = this.nodeArrowSprites[2];
                tween(currentArrow.node)
                    .to(0.05, {}, {
                    })
                    .call(() => {
                         currentArrow.spriteFrame = this.nodeArrowSprites[3];
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

        let index: number = 0;
        this.nodeArrows.forEach((sp) => {
            this.setArrow(this.currentSequence[index], sp);
            index++;
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

        // 淡出效果
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
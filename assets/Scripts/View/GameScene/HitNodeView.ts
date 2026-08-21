import { 
    _decorator, Component, instantiate, Node, Sprite, SpriteFrame, UITransform, Vec3, math,
    input, Input, EventKeyboard, KeyCode, Color, tween, Tween, Button
} from 'cc';

import { BaseView } from '../BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { INoteSequenceData, ISequenceData } from 'db://assets/Scripts/Manager/GameManager';
import { GameTool } from '../../Tools/GameTool';
import { DIFFICULTY_TYPE, RoomData } from '../../Data/RoomData';

const { ccclass, property } = _decorator;

/** 箭頭方向 */
const DIRECTION_ANGLES: Record<string, { normal: number, reversed: number }> = {
    'UP':         { normal: 0,    reversed: 180 },
    'DOWN':       { normal: 180, reversed: 0 },
    'LEFT':       { normal: 90,  reversed: -90 },
    'RIGHT':      { normal: 270, reversed: -270 },
    'UP_LEFT':    { normal: 45,  reversed: -135 },
    'UP_RIGHT':   { normal: -45, reversed: 135 },
    'DOWN_RIGHT': { normal: -135, reversed: 45 },
    'DOWN_LEFT':  { normal: 135, reversed: -45 },
};

const PHONE_DIRECTIONS = ['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'UP_LEFT', 'UP_RIGHT', 'DOWN_LEFT', 'DOWN_RIGHT'];

const TEMP_VEC3 = new Vec3();
const TEMP_COLOR = new Color();
const SCALE_HIT_ZONE = new Vec3(1.5, 1, 1);

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
    private nodeArrowSprites: SpriteFrame[] = []; 

    @property([Button])
    private phoneBtns: Button[] = [];   
    @property(Node)
    private reversPhoneBtnsNode: Node = null;

    private barWidth: number = 0;
    private barStartTime: number = 0;
    private barIntervalMs: number = 0;
    private beatIntervalMs: number = 0; 
    private targetHitTime: number = 0;
    private isRunning: boolean = false;

    private nodeArrows: Sprite[] = [];
    private currentSequence: ISequenceData[] = [];  
    private currentInputIndex: number = 0;          
    private currentProgress: number = 0;            
    private pressedKeys: Set<number> = new Set();   

    private readonly BUFFER_DELAY_SEC: number = 0.035;  

    protected onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.clearBufferTimer();
        this.clearPhoneButtonsEvents();
    }

    public async onOpen(params?: any) {
        super.onOpen(params);

        this.initPhoneButtons();

        this.sprite_nodeBar.node.active = false;
        this.nodeArrowPrefab.active = false;

        const transform = this.sprite_beatBar ? this.sprite_beatBar.getComponent(UITransform) : null;
        this.barWidth = transform ? transform.width : 320;
        
        const hitZoneX = this.barWidth * this.hitRatio;
        this.sprite_hitZone.node.setPosition(hitZoneX, 0, 0);
        this.cursor.setPosition(0, 0, 0);
        this.sprite_beatBar.node.active = false;
    }

    /**
     * 初始化手機按鈕事件
     */
    private initPhoneButtons() {
        if (this.reversPhoneBtnsNode) {
            this.reversPhoneBtnsNode.active = RoomData.difficulty !== DIFFICULTY_TYPE.EASY;
        }

        const isMobile = GameTool.getInstance().isMobileBrowser();

        this.phoneBtns.forEach((btn, index) => {
            if (!btn || !btn.node) return;

            btn.node.active = isMobile;
            
            // 先清理避免重複監聽
            btn.node.off(Button.EventType.CLICK);

            if (index === 0) {
                btn.node.on(Button.EventType.CLICK, this.onSpaceHit, this);
            } else {
                const dir = PHONE_DIRECTIONS[index];
                btn.node.on(Button.EventType.CLICK, () => this.handleDirectionInput(dir), this);
            }
        });
    }

    /**
     * 清理手機按鈕事件
     */
    private clearPhoneButtonsEvents() {
        this.phoneBtns.forEach((btn) => {
            if (btn && btn.node) {
                btn.node.off(Node.EventType.TOUCH_START);
            }
        });
    }

    protected update(deltaTime: number) {
        if (!this.isRunning || this.barIntervalMs <= 0) return;

        // 取得校正後的伺服器當前毫秒
        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        // 進度算式
        this.currentProgress = (currentServerTime - this.barStartTime) / this.barIntervalMs;
        
        // 限縮在 0~1 
        const clampedProgress = math.clamp01(this.currentProgress);
        
        TEMP_VEC3.set(clampedProgress * this.barWidth, 0, 0);
        this.cursor.setPosition(TEMP_VEC3);

        this.updateHitZoneAlpha(currentServerTime);

        if (this.currentProgress >= 1.0) {
            this.resetState();
        }
    }
    
    /**
     * 更新打擊區域透明度
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

        TEMP_COLOR.set(this.sprite_hitZone.color);
        TEMP_COLOR.a = math.clamp(calculatedAlpha, minAlpha, maxAlpha);
        this.sprite_hitZone.color = TEMP_COLOR;
    }

    /**
     * 重置狀態
     */
    private resetState() {
        this.isRunning = false;
        this.clearBufferTimer();

        this.resetSpriteAlpha(this.sprite_beatBar);
        this.resetSpriteAlpha(this.sprite_nodeBar);

        if (this.sprite_hitZone) {
            this.sprite_hitZone.node.setScale(Vec3.ONE);
            this.resetSpriteAlpha(this.sprite_hitZone);
        }

        this.currentInputIndex = 0;
        this.currentSequence = [];
    }

    /**
     * 重置 Sprite 透明度
     * @param sprite 
     * @returns 
     */
    private resetSpriteAlpha(sprite: Sprite) {
        if (!sprite) return;
        sprite.node.active = false;
        TEMP_COLOR.set(sprite.color);
        TEMP_COLOR.a = 255;
        sprite.color = TEMP_COLOR;
    }

    /**
     * 接收資料
     * @param data 
     */
    public reciveData(data: INoteSequenceData) {
        this.resetState();

        this.targetHitTime = data.targetHitTime;
        this.barIntervalMs = data.barIntervalMs || (data.beatIntervalMs * 4);
        this.beatIntervalMs = data.beatIntervalMs || (this.barIntervalMs / 4);

        this.sprite_beatBar.node.active = true;
        this.sprite_hitZone.node.active = true;
        
        // 算出起始點
        this.barStartTime = this.targetHitTime - (this.barIntervalMs * this.hitRatio);
        this.isRunning = true;

        this.showCurrentNode(data.sequence);
    }

    /**
     * 顯示當前譜面
     * @param datas 
     */
    public showCurrentNode(datas: ISequenceData[]) {
        this.currentSequence = datas;
        this.currentInputIndex = 0;

        this.nodeArrows.forEach((sp) => {
            if (sp && sp.node) sp.node.active = false;
        });

        this.sprite_nodeBar.node.active = true;

        datas.forEach((data, index) => {
            let sp: Sprite | null = null;
            if (this.nodeArrows.length > index) {
                sp = this.nodeArrows[index];
            } else {
                const obj = instantiate(this.nodeArrowPrefab);
                obj.active = true;
                obj.setParent(this.sprite_nodeBar.node);

                sp = obj.getComponent(Sprite);
                if (sp) {
                    this.nodeArrows.push(sp);
                }
            }

            if (sp) {
                sp.node.active = true;
                this.setArrow(data, sp);
            }
        });
    }

    /**
     * 設置箭頭
     * @param data 
     * @param sp 
     * @returns 
     */
    private setArrow(data: ISequenceData, sp: Sprite) {
        if (!sp) return;

        sp.spriteFrame = data.isReversed ? this.nodeArrowSprites[1] : this.nodeArrowSprites[0];
        
        TEMP_COLOR.set(255, 255, 255, 255);
        sp.color = TEMP_COLOR;

        const config = DIRECTION_ANGLES[data.direction];
        sp.node.angle = config ? (data.isReversed ? config.reversed : config.normal) : 0;
    }

    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE) {
            this.onSpaceHit();
            return;
        }

        if (this.pressedKeys.has(event.keyCode)) return;
        this.pressedKeys.add(event.keyCode);

        this.clearBufferTimer();

        if (this.isSingleDiagonalKey(event.keyCode)) {
            this.resolveInput();
            return;
        }

        this.scheduleOnce(this.resolveInput, this.BUFFER_DELAY_SEC);
    }

    private onKeyUp(event: EventKeyboard) {
        this.pressedKeys.delete(event.keyCode);
    }

    private clearBufferTimer() {
        this.unschedule(this.resolveInput);
    }

    private resolveInput() {
        this.clearBufferTimer();

        const finalDirection = this.calculateDirection();
        if (finalDirection) {
            this.handleDirectionInput(finalDirection);
        }

        this.pressedKeys.clear(); 
    }

    private isSingleDiagonalKey(code: number): boolean {
        return code === KeyCode.NUM_7 || code === KeyCode.NUM_9 || 
               code === KeyCode.NUM_1 || code === KeyCode.NUM_3;
    }

    private calculateDirection(): string | null {
        const isUp = this.pressedKeys.has(KeyCode.ARROW_UP) || this.pressedKeys.has(KeyCode.KEY_W) || this.pressedKeys.has(KeyCode.NUM_8);
        const isDown = this.pressedKeys.has(KeyCode.ARROW_DOWN) || this.pressedKeys.has(KeyCode.KEY_S) || this.pressedKeys.has(KeyCode.NUM_2);
        const isLeft = this.pressedKeys.has(KeyCode.ARROW_LEFT) || this.pressedKeys.has(KeyCode.KEY_A) || this.pressedKeys.has(KeyCode.NUM_4);
        const isRight = this.pressedKeys.has(KeyCode.ARROW_RIGHT) || this.pressedKeys.has(KeyCode.KEY_D) || this.pressedKeys.has(KeyCode.NUM_6);

        if (isUp && isLeft) return 'UP_LEFT';
        if (isUp && isRight) return 'UP_RIGHT';
        if (isDown && isLeft) return 'DOWN_LEFT';
        if (isDown && isRight) return 'DOWN_RIGHT';

        if (this.pressedKeys.has(KeyCode.NUM_7)) return 'UP_LEFT';
        if (this.pressedKeys.has(KeyCode.NUM_9)) return 'UP_RIGHT';
        if (this.pressedKeys.has(KeyCode.NUM_1)) return 'DOWN_LEFT';
        if (this.pressedKeys.has(KeyCode.NUM_3)) return 'DOWN_RIGHT';

        if (isUp) return 'UP';
        if (isDown) return 'DOWN';
        if (isLeft) return 'LEFT';
        if (isRight) return 'RIGHT';

        return null;
    }

    /**
     * 處理輸入按鍵
     * @param pressedDirection 
     * @returns 
     */
    private handleDirectionInput(pressedDirection: string) {
        if (!this.isRunning || this.currentInputIndex >= this.currentSequence.length) return;

        const data = this.currentSequence[this.currentInputIndex];

        if (pressedDirection === data.direction) {
            const currentArrow = this.nodeArrows[this.currentInputIndex];
            if (currentArrow) {
                Tween.stopAllByTarget(currentArrow.node);
                currentArrow.spriteFrame = this.nodeArrowSprites[2];
                
                tween(currentArrow.node)
                    .delay(0.05)
                    .call(() => {
                        currentArrow.spriteFrame = this.nodeArrowSprites[3];
                        currentArrow.node.angle = DIRECTION_ANGLES[data.direction].normal;
                    })
                    .start();
            }
            this.currentInputIndex++;
        } else {
            this.nodeArrows.forEach((sp) => {
                if (sp && sp.node) Tween.stopAllByTarget(sp.node);
            });
            this.resetInputSequence();
        }
    }

    private resetInputSequence() {
        this.currentInputIndex = 0;
        this.nodeArrows.forEach((sp, idx) => {
            this.setArrow(this.currentSequence[idx], sp);
        });
    }

    private onSpaceHit() {
        if (this.currentProgress < 0.5 || this.currentInputIndex === 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();

        SocketManager.getInstance().sendPlayerHit({
            hitTime: currentServerTime,
            completedCount: this.currentInputIndex,
            sequenceLength: this.currentSequence.length
        });

        this.isRunning = false;

        if (this.sprite_hitZone) {
            tween(this.sprite_hitZone.node)
                .to(0.15, { scale: SCALE_HIT_ZONE })
                .start();
        }

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

            TEMP_COLOR.set(sprite.color.r, sprite.color.g, sprite.color.b, 0);
            tween(sprite)
                .to(0.45, { color: TEMP_COLOR })
                .call(onFadeComplete)
                .start();
        };

        fadeOutSprite(this.sprite_beatBar);
        fadeOutSprite(this.sprite_nodeBar);
    }
}
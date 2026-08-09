import { 
    _decorator, Component, instantiate, Node, Sprite, SpriteFrame, UITransform, Vec3, math,
    input, Input, EventKeyboard, KeyCode 
} from 'cc';
import { BaseView } from '../BaseView';
import { SocketManager } from 'db://assets/Scripts/Network/SocketManager';
import { INoteSequenceData } from '../../Manager/GameManager';

const { ccclass, property } = _decorator;

/**
 * 打擊譜面介面
 */
@ccclass('HitNodeView')
export class HitNodeView extends BaseView {
    @property(Node)
    private beatBar: Node = null;
    @property(Node)
    private cursor: Node = null;
    @property(Node)
    private hitZone: Node = null;
    @property({ tooltip: "打擊點位於背景條的比例 (0.8 代表 80% 位置)" })
    private hitRatio: number = 0.8;

    @property(Node)
    private nodePanel: Node = null;
    @property(Node)
    private nodeArrowPrefab: Node = null;
    @property([SpriteFrame])
    private nodeArrowSprites: SpriteFrame[] = []; // [0]: 預設/未按 , [1]: 正確按壓

    private barWidth: number = 0;
    private barStartTime: number = 0;
    private barIntervalMs: number = 0;
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

        this.nodePanel.active = false;
        this.nodeArrowPrefab.active = false;

        const transform = this.beatBar.getComponent(UITransform);
        this.barWidth = transform ? transform.width : 800;
        const hitZoneX = this.barWidth * this.hitRatio;
        this.hitZone.setPosition(new Vec3(hitZoneX, 0, 0));
        this.cursor.setPosition(new Vec3(0, 0, 0));
        this.beatBar.active = false;
    }

    protected update(deltaTime: number) {
        if (!this.isRunning || this.barIntervalMs <= 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();
        
        // 計算當前進度並記錄到全域變數
        this.currentProgress = (currentServerTime - this.barStartTime) / this.barIntervalMs;
        
        const currentX = math.clamp01(this.currentProgress) * this.barWidth;
        this.cursor.setPosition(new Vec3(currentX, 0, 0));

        // 未打擊
        if (this.currentProgress >= 1.0) {
            this.resetState();
        }
    }

    /**
     * 重製狀態
     */
    private resetState() {
        this.isRunning = false;
        this.beatBar.active = false;
        this.nodePanel.active = false;

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

        this.beatBar.active = true;
        this.barStartTime = this.targetHitTime - (this.barIntervalMs * this.hitRatio);
        this.isRunning = true;

        this.showCurrentNode(data.sequence);
    }

    /**
     * 顯示當前譜面
     */
    public showCurrentNode(sequence: string[]) {
        this.currentSequence = sequence;
        this.currentInputIndex = 0; // 重置輸入索引

        // 移除舊譜面
        this.nodeArrows.forEach((nodeArrow) => {
            if (nodeArrow && nodeArrow.node) {
                nodeArrow.node.destroy();
            }
        });
        this.nodeArrows = [];

        this.nodePanel.active = true;

        // 產生新譜面
        sequence.forEach((sequenceString) => {
            let obj = instantiate(this.nodeArrowPrefab);
            obj.active = true;
            obj.setParent(this.nodePanel);

            let sp = obj.getComponent(Sprite);
            if (sp && this.nodeArrowSprites.length > 0) {
                sp.spriteFrame = this.nodeArrowSprites[0];
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

        if (!pressedDirection) return;

        // 如果箭頭已經全部輸入完成，忽視多餘的方向鍵輸入
        if (this.currentInputIndex >= this.currentSequence.length) return;

        // 比對當前位置的箭頭方向
        const targetDirection = this.currentSequence[this.currentInputIndex];

        if (pressedDirection === targetDirection) {
            // 輸入正確：切換圖片為 nodeArrowSprites[1]
            if (this.nodeArrows[this.currentInputIndex] && this.nodeArrowSprites[1]) {
                this.nodeArrows[this.currentInputIndex].spriteFrame = this.nodeArrowSprites[1];
            }
            this.currentInputIndex++;
        } else {
            // 輸入錯誤：全部箭頭恢復為 nodeArrowSprites[0]，重置索引為 0
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
                sp.spriteFrame = this.nodeArrowSprites[0];
            }
        });
    }

    /**
     * 按下 Space 打擊觸發
     */
    private onSpaceHit() {
        // 進度小於 50% || 沒有任何正確
        if(this.currentProgress < 0.5 || this.currentInputIndex == 0) return;

        const currentServerTime = SocketManager.getInstance().getCorrectedServerTime();

        // 發送給 Server 判定
        SocketManager.getInstance().sendPlayerHit({
            hitTime: currentServerTime,                 // 按下 Space 的校正時間
            completedCount: this.currentInputIndex,     // 正確輸入的箭頭數量
            sequenceLength: this.currentSequence.length // 總箭頭數
        });

        this.resetState();
    }
}
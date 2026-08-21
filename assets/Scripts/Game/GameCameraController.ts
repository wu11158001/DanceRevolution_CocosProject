import { _decorator, Component, Node, Vec3, Tween, tween, Camera, Layers } from 'cc';
import { GameTextTipView } from '../View/GameScene/GameView/GameTextTipView';
const { ccclass, property } = _decorator;

/**
 * 攝影機運鏡點位資料結構
 */
interface CameraCamPoint {
    position: Vec3;     // 目標位置（世界座標）
    rotation: Vec3;     // 目標旋轉角度（歐拉角）
    duration: number;   // 移動到該點位所需時間（秒）
}

/**
 * 遊戲攝影機控制器
 */
@ccclass('GameCameraController')
export class GameCameraController extends Component {
    @property(Camera)
    private camera3D: Camera = null!;
    @property(Node)
    private cameraNode: Node = null!;
    @property(Node)
    private camera3DBgNode: Node = null;

    private gameTextTipView: GameTextTipView = null;
    
    private currentTween: Tween<Node> | null = null;
    private bgLayerBit: number = 0;
    
    /**
     * 運鏡完成標記
     */
    public isRoutineFinish: boolean = false;

    /**
     * 開場運鏡路徑定義
     */
    private readonly cameraPoints: CameraCamPoint[] = [
        { position: new Vec3(-3, 8.1, 6), rotation: new Vec3(-55, -9.2, 7.8), duration: 0.7 },
        { position: new Vec3(7, 14, 4.5), rotation: new Vec3(-60, 28, -9), duration: 2 },
        { position: new Vec3(0, 8, 5.6), rotation: new Vec3(-65, 0, 0), duration: 1.3 },
        { position: new Vec3(0, 2.7, 10), rotation: new Vec3(-12, 0, 0), duration: 2 },
    ];

    protected onLoad(): void {
        this.bgLayerBit = Layers.Enum['3DBg'];
    }

    /**
     * 執行遊戲開場運鏡動畫
     * @param gameTextTipView 遊戲文字提示視圖引用
     */
    public onGameOpening(gameTextTipView: GameTextTipView): void {
        this.gameTextTipView = gameTextTipView;

        this.camera3DBgNode.active = false;
        this.camera3D.visibility |= this.bgLayerBit;

        // 設定攝影機初始位置（運鏡起點）
        this.cameraNode.position = new Vec3(0, 6, 6);
        this.cameraNode.eulerAngles = new Vec3(-50, 0, 0);

        // 開始播放運鏡動畫
        this.playCameraRoutine(this.cameraPoints);
    }

    /**
     * 執行攝影機運鏡動畫
     * @param points 運鏡路徑點位陣列
     */
    private playCameraRoutine(points: CameraCamPoint[]): void {
        if (!this.cameraNode || points.length === 0) return;

        if (this.currentTween) {
            this.currentTween.stop();
        }

        let camTween = tween(this.cameraNode);

        // 動態串接每個運鏡點位
        for (const pt of points) {
            camTween = camTween.to(pt.duration, {
                position: pt.position,
                eulerAngles: pt.rotation,
            }, {
                easing: 'sineInOut'
            });
        }

        // 運鏡結束後的回調處理
        this.currentTween = camTween
            .call(() => {
                // 顯示遊戲 UI
                this.onShowGameUI();
                // 觸發 "Ready" 提示動畫
                this.gameTextTipView?.onReady();
            })
            .start();
    }

    /**
     * 顯示遊戲 UI（運鏡結束後呼叫）
     */
    public onShowGameUI(): void {
        // 停止運鏡 Tween
        if (this.currentTween) {
            this.currentTween.stop();
        }

        // 獲取最終運鏡點位
        const finalPoint = this.cameraPoints[this.cameraPoints.length - 1];
        this.cameraNode.position = finalPoint.position;
        this.cameraNode.eulerAngles = finalPoint.rotation;

        this.isRoutineFinish = true;
        this.camera3DBgNode.active = true;
        this.camera3DBgNode.position = this.cameraNode.position;
        this.camera3D.visibility &= ~this.bgLayerBit;
    }
}



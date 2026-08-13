import { _decorator, Component, Node, Vec3, Tween, tween, Camera, Layers } from 'cc';
import { GameTextTipView } from '../View/GameScene/GameView/GameTextTipView';
const { ccclass, property } = _decorator;

/**
 * 攝影機節點資料
 */
interface CameraCamPoint {
    position: Vec3;     // 目標位置
    rotation: Vec3;     // 目標旋轉建
    duration: number;   // 移動時間
}

/**
 * 遊戲攝影機控制
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
     * 遊戲開場運鏡
     */
    public onGameOpening(gameTextTipView: GameTextTipView) {
        this.gameTextTipView = gameTextTipView;

        this.camera3DBgNode.active = false;
        this.bgLayerBit = Layers.Enum['3DBg'];
        this.camera3D.visibility |= this.bgLayerBit;

        this.cameraNode.position = new Vec3(0, 6, 6);
        this.cameraNode.eulerAngles = new Vec3(-50, 0, 0);

        const cameraPoints: CameraCamPoint[] = [
            { position: new Vec3(-3, 8.1, 6), rotation: new Vec3(-55, -9.2, 7.8), duration: 1 },
            { position: new Vec3(0, 13, 5.6), rotation: new Vec3(-65, 0, 0), duration: 1.5 },
            { position: new Vec3(7, 14, 4.5), rotation: new Vec3(-60, 28, -9), duration: 1.5 },
            { position: new Vec3(0, 2.7, 10),    rotation: new Vec3(-12, 0, 0), duration: 2 },
        ];

        // 3. 播放運鏡
        this.playCameraRoutine(cameraPoints);
    }

    /**
     * 執行運鏡
     * @param points 
     * @returns 
     */
    private playCameraRoutine(points: CameraCamPoint[]) {
        if (!this.cameraNode || points.length === 0) return;

        if (this.currentTween) {
            this.currentTween.stop();
        }

        let camTween = tween(this.cameraNode);

        // 動態串接每一站
        for (const pt of points) {
            camTween = camTween.to(pt.duration, {
                position: pt.position,
                eulerAngles: pt.rotation,
            }, {
                easing: 'sineInOut'
            });
        }

        // 鏈結完成後開始執行
        this.currentTween = camTween
            .call(() => {
                console.log('攝影機運鏡結束!');
                this.camera3DBgNode.active = true;
                this.camera3DBgNode.position = this.cameraNode.position;
                this.camera3D.visibility &= ~this.bgLayerBit;
                this.gameTextTipView.onReady();
            })
            .start();
    }
}



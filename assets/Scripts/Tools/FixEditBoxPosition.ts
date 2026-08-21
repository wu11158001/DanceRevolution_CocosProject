import { _decorator, Component, EditBox, UITransform, view } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 修正EditBox輸入時偏移
 */
@ccclass('FixEditBoxPosition')
export class FixEditBoxPosition extends Component {

    start() {
        const editBox = this.getComponent(EditBox);
        if (!editBox) return;

        // 監聽開始編輯事件
        this.node.on(EditBox.EventType.EDITING_DID_BEGAN, this.fixDomPosition, this);
    }

    fixDomPosition(editBox: EditBox) {
        // 延遲 30ms 確保 Cocos 已將 DOM input 插入頁面
        setTimeout(() => {
            const impl = (editBox as any)._impl;
            if (!impl || !impl._elem) return;

            const inputStyle = impl._elem.style; // 取得原生的 HTML <input> 或 <textarea>
            const uiTransform = this.getComponent(UITransform);
            const canvas = document.getElementById('GameCanvas');

            if (!uiTransform || !canvas) return;

            // 取得 Canvas 在瀏覽器視埠 (Viewport) 中的實際渲染位置與尺寸
            const rect = canvas.getBoundingClientRect();

            // 取得 EditBox 節點在 Cocos 世界座標中的位置 (以 Canvas 左下角為 0,0)
            const worldPos = this.node.getWorldPosition();
            const visibleSize = view.getVisibleSize();

            // 計算比例 (Node世界座標 -> Canvas DOM 實際像素)
            const scaleX = rect.width / visibleSize.width;
            const scaleY = rect.height / visibleSize.height;

            const nodeWidth = uiTransform.width * scaleX;
            const nodeHeight = uiTransform.height * scaleY;

            // 計算左上角 DOM 座標 (HTML 座標系原點在左上角)
            const left = rect.left + (worldPos.x - uiTransform.width * uiTransform.anchorX) * scaleX;
            const top = rect.top + (visibleSize.height - worldPos.y - uiTransform.height * (1 - uiTransform.anchorY)) * scaleY;

            // 強制覆寫 DOM input 的 CSS 絕對定位
            inputStyle.position = 'fixed';
            inputStyle.left = `${left}px`;
            inputStyle.top = `${top}px`;
            inputStyle.width = `${nodeWidth}px`;
            inputStyle.height = `${nodeHeight}px`;
            inputStyle.transform = 'none'; // 移除 Cocos 預設可能算錯的 transform
            inputStyle.fontSize = `${nodeHeight * 0.6}px`; // 同步文字大小
        }, 30);
    }
}
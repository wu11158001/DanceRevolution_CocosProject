import { _decorator, Color, Component, Node, RichText } from 'cc';
const { ccclass, property } = _decorator;

/**
 * RichText點擊
 */
@ccclass('RichTextClickHandler')
export class RichTextClickHandler extends Component {
    @property(RichText)
    public mainRichText: RichText = null;

    /**是否可點擊 */
    public isCanClick: boolean  = true;
    /**點擊文字內容 */
    public clickString: string = '';
    /**滑入文字內容 */
    public enterString: string = '';
    /** 點擊事件 */
    public clickAction: () => void;

    // 紀錄文字內容
    private contentString: string = '';

    protected onDestroy(): void {
        this.node.off(Node.EventType.MOUSE_ENTER, this.onEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onLeave, this);
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    protected start(): void {
        this.mainRichText = this.node.getComponent(RichText);

        this.node.on(Node.EventType.MOUSE_ENTER, this.onEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onLeave, this);
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    /**
     * 滑入事件
     */
    private onEnter() {
        if(this.isCanClick) {
            this.mainRichText.string = this.enterString;
        }
    }

    /**
     * 滑出事件
     */
    private onLeave() {
        if(this.isCanClick) {
            this.mainRichText.string = this.contentString;
        }
    }

    /**
     * 設置內容
     * @param content 
     */
    public setContent(content: string) {
        this.mainRichText.string = content;
        this.contentString = content;
    }

    /**
     * 點擊開始事件
     * @param event 
     * @param param 
     */
    public onTouchStart(event: Event, param: string) {
        if(this.isCanClick) {
            this.mainRichText.string = this.clickString;

            this.clickAction?.();
        }
    }
    
    /**
     * 點擊結束事件
     * @param event 
     * @param param 
     */
    public onTouchEnd(event: Event, param: string) {
        if(this.isCanClick) {
            this.mainRichText.string = this.contentString;
        }     
    }
}



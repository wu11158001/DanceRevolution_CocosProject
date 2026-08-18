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
    /**滑入文字內容 */
    public enterString: string = '';
    /** 點擊事件 */
    public clickAction: () => void;

    // 紀錄文字內容
    private contentString: string = '';
    // 判斷是否停留在元件
    private isEnter: boolean = false;

    protected onDestroy(): void {
        this.node.off(Node.EventType.MOUSE_ENTER, this.onEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onLeave, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouch, this);
    }

    protected start(): void {
        this.mainRichText = this.node.getComponent(RichText);

        this.node.on(Node.EventType.MOUSE_ENTER, this.onEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onLeave, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouch, this);
    }

    /**
     * 滑入事件
     */
    private onEnter() {
        this.isEnter = true;

        if(this.isCanClick) {
            this.mainRichText.string = this.enterString;
        }
    }

    /**
     * 滑出事件
     */
    private onLeave() {
        this.isEnter = false;

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
     * 點擊事件
     * @param event 
     * @param param 
     */
    public onTouch(event: Event, param: string) {
        if(this.isCanClick && this.isEnter) {
            this.clickAction?.();
        }       
    }
}



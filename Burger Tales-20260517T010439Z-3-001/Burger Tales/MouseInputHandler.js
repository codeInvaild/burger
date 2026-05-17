import { UserInterfaceService as UIS } from './UserInterfaceService.js'
import { Signal } from "./SignalService.js";

export const mouse = {
    x:0,
    y:0,
    clicked : false,
    down: false,

    onMouseUp : new Signal(),
    onClick : new Signal(),
    onScroll : new Signal(),//use for scrolling frames
    onDragStart : new Signal(),
    onDragEnd : new Signal(),
    onMouseOver : new Signal(),

    init(canvas) {
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            this.x = e.clientX - rect.left;
            this.y = e.clientY - rect.top;
            this.onMouseOver.fire(this.x, this.y);
        });

        canvas.addEventListener('mousedown', () => {
            this.down = true;
            this.clicked = true;
            this.onClick.fire(this.x, this.y);
            console.log("you clicked");
        });

        canvas.addEventListener('mouseup', () => {
            this.down = false;
            this.onMouseUp.fire(this.x, this.y);
            console.log("you let go");
        });
    },

    update() {
        this.clicked = false;
        // UIS.update(this.x, this.y);
    }
}

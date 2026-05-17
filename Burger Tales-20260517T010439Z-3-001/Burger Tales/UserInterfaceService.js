import {mouse} from "./MouseInputHandler.js";
import {Signal} from "./SignalService.js";
import { newRect, newText, newImage } from "./Utility.js"

//bone class
export class UIElement {
    constructor({name, x, y, width, height, visible = true}) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.visible = visible;
        this.parent = null;
    }

    getGlobalPosition(offsetX = 0, offsetY = 0) {
        return {
            x: offsetX + this.x,
            y: offsetY + this.y
        };
    }

    containsPoint(px, py, offsetX = 0, offsetY = 0) {
        const { x, y } = this.getGlobalPosition(offsetX, offsetY);
        return (
            px >= x &&
            px <= x + this.width &&
            py >= y &&
            py <= y + this.height
        );
    }
}


//basic filled rectangles or circles
export class shapeElement extends UIElement {
    constructor({name, x,y,width,height,visible=true, shape="rect",color="rgb(255,255,255)"}) {
        super({name, x,y,width,height,visible});
        this.shape = shape;
        this.color = color;
    }

    draw(offsetX = 0, offsetY = 0) {
        if (!this.visible) return;

        const { x, y } = this.getGlobalPosition(offsetX, offsetY);
        newRect(this.name, x, y, this.width, this.height, this.color, false).draw();
    }
}

//basic image displays (In UI)
export class imageElement extends UIElement {
    constructor({name, x,y,width,height,visible=true, imageURL = "tree2"}) {
        super({name, x,y,width,height,visible});
        this.image = imageURL;
    }

    draw(offsetX = 0, offsetY = 0) {
        if (!this.visible) return;

        const { x, y } = this.getGlobalPosition(offsetX, offsetY);
        newImage(this.name, x, y, this.width, this.height, this.image).draw();
    }

}

//buttons can be interacted by keystrokes and mouse events
export class buttonElement extends UIElement {
    constructor({name, x, y, width, height, visible=true,text,color = "#444", textColor = "#fff"}) {
        super({name, x, y, width, height, visible});
        this.text = text;
        this.textColor = textColor;
        this.color = color;

        //mouse events
        this._hover = new Signal();
        this._hovered = new Signal();

        //keystroke events
        this._keystrokeLeft = new Signal();
        this._keystrokeRight = new Signal();
        this._keystrokeUp = new Signal();
        this._keystrokeDown = new Signal();

        //INTERACTION EVENT
        this._click = new Signal();
    }

    draw() {

    }
}

export class UIGroup {
    constructor({ name, x = 0, y = 0, visible = true }) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.visible = visible;
        this.children = [];
        this.parent = null;
    }

    add(child) {
        child.parent = this;
        this.children.push(child);
    }

    remove(child) {
        this.children = this.children.filter(c => c !== child);
        child.parent = null;
    }

    setVisible(value) {
        this.visible = value;
    }

    draw(offsetX = 0, offsetY = 0) {
        if (!this.visible) return;

        const globalX = offsetX + this.x;
        const globalY = offsetY + this.y;

        for (let child of this.children) {
            if (child.draw) {
                child.draw(globalX, globalY);
            }
        }
    }
}


//USER INTERFACE HAS THE HIGHEST DRAW PRIORITY (TOP DRAW)
export let UserInterfaceService = {
    root: new UIGroup({ name: "root" }),
    groups: {},

    createGroup(name, options = {}) {
        const group = new UIGroup({ name, ...options });
        this.groups[name] = group;
        this.root.add(group);
        return group;
    },

    getGroup(name) {
        return this.groups[name];
    },

    showGroup(name) {
        if (this.groups[name]) {
            this.groups[name].setVisible(true);
        }
    },

    hideGroup(name) {
        if (this.groups[name]) {
            this.groups[name].setVisible(false);
        }
    },

    update(dt) {
        this.root.draw();
    }
};

//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//SET UP UI GROUPS HERE -----------------------------------------------------------------------------------------------------------------
//SET UP UI GROUPS HERE ----------------------------------------------------------------------------------------------------------------
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//

const battleMenu = UserInterfaceService.createGroup("BattleMenu", {
    x: 100,
    y: 400
});

const buttonGroup = new UIGroup({ name: "ButtonRow", x: 0, y: 0 });
battleMenu.add(buttonGroup);

buttonGroup.add(new buttonElement({
    name: "AttackButton",
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    text: "Attack"
}));

buttonGroup.add(new buttonElement({
    name: "DefendButton",
    x: 120,
    y: 0,
    width: 100,
    height: 40,
    text: "Defend"
}));

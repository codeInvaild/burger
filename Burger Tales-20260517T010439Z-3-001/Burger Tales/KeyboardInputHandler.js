import { Signal } from "./SignalService.js"

export let keys = {};

export let keyboardEvents = {
    keyPress : new Signal(),
    keyUp : new Signal(),
    keyDown : new Signal(),
}

export let keybinds = {
    //World Navigation
    Up: "KeyW",
    Down: "KeyS",
    Left: "KeyA",
    Right: "KeyD",
    Interact : "KeyE",//universal
    Attack: "KeyF",
    Sprint: "ShiftLeft",
    //In-battle events
    MenuBack : "KeyX",
    Action: "Space", //used for dodging AND attacking
    MenuNavigationLeft : "KeyQ",
    MenuNavigationRight : "KeyE",
    //Misc.
    QuickSave : "KeyG",
    QuickLoad : "KeyL",
    QuickMenu : "KeyV",
}

for (let bind in keybinds) {keys[keybinds[bind]] = false} //we are setting up keybinds so we get no null values at runtime

document.addEventListener('keydown', e => {
    keys[e.code] = true
    keyboardEvents.keyDown.fire(e.code);
    console.log(e.code);
});

document.addEventListener('keyup', e => keys[e.code] = false);
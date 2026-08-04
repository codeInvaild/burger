import { Signal } from "./SignalService.js"

export let keys = {};

export let keyPresses = {};

export let keyReleases = {};

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
    MenuNavigationLeft : "KeyA",
    MenuNavigationRight : "KeyD",
    //Misc.
    QuickSave : "KeyG",
    QuickLoad : "KeyL",
    QuickMenu : "KeyV",
}

for (let bind in keybinds) {keys[keybinds[bind]] = false} //we are setting up keybinds so we get no null values at runtime

document.addEventListener('keydown', e => {
    if (!keys[e.code]) {keyPresses[e.code] = true;}
    keys[e.code] = true
    keyboardEvents.keyDown.fire(e.code);
    // console.log(keyPresses);
});

document.addEventListener('keyup', e => {
    keyReleases[e.code] = true;
    keys[e.code] = false}
);

export function keyPressUpdate() {
    for (const code in keyPresses) {
        keyPresses[code] = false;
    }
    for (const code in keyReleases) {
        keyReleases[code] = false;
    }
}

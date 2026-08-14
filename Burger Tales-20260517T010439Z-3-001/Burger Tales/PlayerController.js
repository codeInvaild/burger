//THIS IS THE PLAYER CONTROLLER FOR THE WORLD, DOES NOT APPLY FOR MENUS OR THE BATTLE STATE; FIND THE ACCORDING SCRIPT

import { keys, keybinds, keyPresses } from './KeyboardInputHandler.js';
import {LERP} from "./Utility.js";
const canvas = document.getElementById('canvas');
import {dialogue as battleHandler, dialogue as dialogueHandler} from "./dialogueClass.js"
import { battle } from "./BattleHandler.js";
import {world,location} from "./WorldHandler.js"

export let playerController = {//this handles the player within the world and moving them with the desired keybinds
    image : "cobalt",
    Direction : "forward",
    x:100,
    y:100,
    centerX : 50,
    centerY : 50,
    width:100,
    height:100,
    collisionData : {
        x:25,
        y:25,
        width:50,
        height:50,
    },
    interactionBox : {
        x:-50,
        y:-50,
        width:200,
        height:200,
    },
    speed:80, //80
    velocity : {x:0,y:0},
    decay : 0.85, //0.85
    colliding : false,
    interaction : {Type: "none", Data : "none"},
    state : "active",

    sprintDebounce : false,
    sprintSpeed: 2000,
    sprintTimerAccumulation : 0,
    sprintTimer : 2,

    debounce : false,

    update : function(dt){ //we can treat this as the input handler too
        this.velocity.x *=this.decay
        this.x += ((this.velocity.x * dt));
        this.velocity.y *=this.decay
        this.y += ((this.velocity.y * dt));

        this.centerX  = this.x + (this.width / 2);
        this.centerY  = this.y + (this.height / 2);



        if (keyPresses[keybinds.Interact] && !this.debounce) {
            // this.debounce = true;

            if (this.state === "dialogue") {
                dialogueHandler.handlePlayerInput();
            } else {
                switch (playerController.interaction.Type) {
                    case "dialogue":
                        this.state = "dialogue";
                        dialogueHandler.resolve(playerController.interaction.Data,true);
                        break;
                    case "battle":
                        this.state = "battle";
                        console.log(playerController.interaction.Data);
                        battle.start(playerController.interaction.Data.enemies, world.currentLocation,playerController.interaction.Data.backgroundData);
                        break;
                    default:
                        break;
                }
            }
            setTimeout(() => {this.debounce = false},200);

        }

        if (keys[keybinds.Sprint] && this.sprintDebounce === false ) {
            this.speed = this.sprintSpeed;
            this.sprintDebounce = true;
            this.sprintTimerAccumulation = 0;
        } else {this.speed = 80;}

        if (this.sprintDebounce) {this.sprintTimerAccumulation += dt;}
        if (this.sprintTimerAccumulation > this.sprintTimer) { this.sprintDebounce = false;}

        if (keys[keybinds.Up] && this.state === "active") {
            this.velocity.y -= this.speed;
        }
        if (keys[keybinds.Down] && this.state === "active") {
            this.velocity.y += this.speed ;
        }
        if (keys[keybinds.Left] && this.state === "active") {
            this.velocity.x -= this.speed;
        }
        if (keys[keybinds.Right] && this.state === "active") {
            this.velocity.x += this.speed ;
        }

    }
}

export let camera = {
    x:0,
    y:0,
    width : canvas.width, //USE FOR BOUNDS OPERATIONS
    height : canvas.height,
    followSpeed:0.1,
    shaking:false,

    update : function(player,map,tile_size) {
        camera.x = LERP(camera.x,playerController.centerX - camera.width / 2,this.followSpeed);
        camera.y = LERP(camera.y,playerController.centerY - camera.height / 2,this.followSpeed);

        const mapWidthPx  = map[0].length * tile_size;
        const mapHeightPx = map.length * tile_size;

        // Clamp to map bounds
        camera.x = Math.max( //MAX clamps us to the LEFT
            0,//left edge case
            Math.min(camera.x, mapWidthPx - camera.width) //MIN clamps us to the RIGHT
        );//                   ^ This variable tell us the very right edge the camera can look at

        camera.y = Math.max(//MAX clamps us to the TOP
            0,
            Math.min(camera.y, mapHeightPx - camera.height) //MIN Clamps us to the BOTTOM
        );

        // Handle maps smaller than the camera bounds
        if (mapWidthPx < camera.width) {
            camera.x = (mapWidthPx - camera.width) / 2;
        }
        if (mapHeightPx < camera.height) {
            camera.y = (mapHeightPx - camera.height) / 2;
        }
    }
}

export let playerInventory = [
    "sugar_apple",
    "sugar_apple",
    "cornball",
    "sugar_apple",
    "sugar_apple",
    "cornball",
    "sugar_apple",
    "sugar_apple",
    "cornball",
    "ketchup",

];//SHOULD BE A LIST OF REFERENCES TOWARDS ITEMS IN THE ITEM DIRECTORY

export let playerSettings= {
    music_volume : 1,
    sfx_volume : 1,
    screen_shake : true,
    shaders : true,
    preloadWorld : true,
    preloadWorldDepth : 1,
}

export let playerData = { //This handles all necessary player data
    location : "",
    internalData : [],
    items : [],
    inventory : [], //misc items or like random items I want to give to the player lol
    enchants : [],
}

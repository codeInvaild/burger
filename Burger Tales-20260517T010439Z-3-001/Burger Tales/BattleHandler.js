//this script handles ALL THINGS battle related

import { actionDirectory, dodgeHandler, AnimationManager } from "./actionDirectory.js";
import { allyDirectory } from "./AllyDirectory.js";
import { availableAssets } from "./AssetLoader.js";
import { gameState, changeGameState } from "./main.js";
import  {enemyDirectory} from "./enemyDirectory.js";
// import { signal } from "./SignalService.js";
import {world } from "./WorldHandler.js";
import {newImage, newRect} from "./Utility.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const allyXBuffer = 100;
const enemyXBuffer = 950;
const heightBuffer = 200;
const characterSize = 150;
const heightAddon = 100;

class vector2D {//BASED ON CAMERA POSITION
    constructor(x,y,width,height,rotation) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
    }

    getCameraPosition(){
        return {x:this.x - battleCamera.x, y:this.y - battleCamera.y};
    }

    scale(newWidth, newHeight) {
        this.x = this.x - (newWidth-this.width);
        this.y = this.y - (newHeight-this.height);
        this.width = newWidth;
        this.height = newHeight;
    }
}

let battleCamera = {//allows us to have an independent camera
    x : 0,
    y : 0,
    width : 0,
    height : 0,

    zoom : 1,
    rotation : 0,

    update(){

    },

    INIT(w,h){//setup width

    }
}

export let playerTeam = ["Ketchup", "Ketchup", "Ketchup"];

class entity{
    //percentage based modifiers
    static battleModifiers = {
        ally : {
            health: 1,
            defense: 1,
            attack:1,
            speed:1,
            energy:1,
        },
        enemy: {
            health: 1,
            defense: 1,
            attack:1,
            speed:1,
            energy:1,
        }
    }

    constructor(stats,vectorData,side) {
        this.worldData = new vector2D(vectorData.x,vectorData.y,vectorData.width,vectorData.height,vectorData.rotation);
        this.maxStats = stats;//this contains original stats, sometimes we will have modifiers that change max stats at runtime so this is why we need this
        this.health = stats.health;
        this.defense = stats.defense;
        this.attack = stats.attack;
        this.energy = stats.energy;
        this.speed = stats.speed;
        this.offensive = {};
        this.other = {};
        this.name = stats.name;
        this.image = stats.image;
        this.stats = [];
        if (side === "allies") {
            this.selectedAction = {
                category : "",
                subcategory : "",
                target : "",
            };
        }
        for (let action of stats.offensive) {
            this.offensive[action] = actionDirectory[action]
        }

        for (let action of stats.other) {
            this.other[action] = actionDirectory[action]
        }

        this.logic = stats.logic //allies should have this as undefined; the ally controller has a unique edge case for that
        this.buffs = [];
        this.debuffs = [];
        this.alive = true;
    }

    take(stat,amount){
        if (!this.alive) return;
        this[stat] = Math.min(this[stat] + amount,this.maxStats[stat]);
    };

    give(stat,amount){
        if (!this.alive) return;
        this[stat] = Math.min(this[stat] + amount,this.maxStats[stat]);
    }
}

export const battleStates = {//ENUM EQUIVALENT
    INACTIVE: "INACTIVE",

    PLAYER_SELECTION: "PLAYER_SELECTION",//this is where players select each ally to do something
    // the turn order is hidden in this state, the player has to assume that their allies go in said order

    TURN_START : "TURN_START",
    TURN_WAITING:"TURN_WAITING",//while a function is running, just focus on updating the deltas of said functions

    BATTLE_END : "BATTLE_END",//victory or lose condition
}

export let battlefield = {

    turnOrder : [],

    allies : [],
    enemies : [],

    cycle : 0,
    turn : 1,

    previousState : battleStates.INACTIVE,
    state : battleStates.INACTIVE,
    stateInfo : {},//metadata to prevent massive enums

    newEntity(entityName,side,stats,vectorData){
        this[side].push(new entity(entityName,side,stats,vectorData));
    },

    rest(side,entity){ //just allows said entity to regain energy

    },

    createTurns() {
        this.turnOrder = [];

        for (let a in this.allies) {
            this.turnOrder.push({name:a.name,spd:this.allies[a].spd});
        }

        for (let e in this.enemies) {
            this.turnOrder.push({name:e.name,spd:this.enemies[e].spd});
        }

        this.turnOrder.sort((a, b) => b.spd - a.spd);
    },

    //as soon as we call this, we offload control to actionDirectory.js
    grantTurn() {
        if (this.turn > this.turnOrder.length) {
            this.cycle++;
            this.turn = 1;
            //we are reconstructing the turn order every new CYCLE btw
        }

        if (this.turnOrder[this.turn-1].side === "allies") {
            battlefield.stateInfo = {menu : "battleMain"}
        } else {
            battlefield[this.turnOrder[this.turn-1].side][this.turnOrder[this.turn-1].who]?.logic();
        }
    },
}


//HOW PLAYER SELECTION WORKS
/*
* 1. Player can select between their entire team (who hasn't acted yet)
* vvv (Player selects an ally)
* 2. Player selects an action for that ally to do
* 3. Player enters a sub-menu of according actions
* 4. When player selects their final, desired action, make them select a target through ANOTHER sub-menu
* 5. When the player selects their action, fill their logic block with the action name alongside supplied target as a parameter
* 6. REPEAT 1-5 UNTIL ALL ALLIES HAVE A LOGIC BLOCK THAT ISN'T NULL/UNDEFINED
*
*
* */

let battleUI = {//this purely handles ui which is drawn over everything,

    renderQueue : [],
    state : {
        action : "none",
        menu : "main",
        allyIndex : 0,
        menuIndex : 0,
        currentSelection : null,
        playerInput : false,
        inputDebounce : false, //prevent multi triggers of input
    },

    update(deltaTime) {
        if (this.state.playerInput) { //handle player input first

        }

        //ALWAYS DRAW HEALTH AND ENERGY BELOW EACH ENTITY
        //draw a red/green box that keeps track of how many debuffs/buffs an entity has, the player can click on them to view what they are


        if (this.state.action === "player") {
            //draw a menu around the current character taking action
            let currentAlly = battlefield.allies[this.state.allyIndex];
            console.log("playa do something noob")
            // let OffensiveActionBlock = newRect("player_offensive",);
            // OffensiveActionBlock.draw();

            //draw little things around the ally and maybe zoom towards them
            //once the player selects an action, fill their logic block with a function to call said action

        }
    },

    draw(){

    },
}

function setState(newState) {
    battlefield.state = newState;

    switch(newState) {
        case battleStates.CREATE_TURN_ORDER:
            battlefield.createTurns();
            break;
        case battleStates.TURN_WAITING:
            battlefield.grantTurn();
            break;
        case battleStates.BATTLE_END:
            // cleanup
            break;
    }
}

export let battle = {
    currentSong : "",//FILE PATH NAME, NOT MP3

    //initializes the whole field and updates game state + screen state
    start( enemyData ,area) {
        //area determines battle music unless enemy overrides it, it also determines bg
        let worldArea = world.locations[area];
        //checks what music to use
        if (this.currentSong !== worldArea.battleMusic || this.currentSong === "") {
            if (this.currentSong !== "") {availableAssets.music[this.currentSong].stop();}
            this.currentSong = worldArea.battleMusic;
        }
        availableAssets.music[this.currentSong].play();

        //load all allies
        for (let allyIndex=0; allyIndex < playerTeam.length;allyIndex++) {
            battlefield.allies.push(new entity(allyDirectory[playerTeam[allyIndex]],new vector2D(allyXBuffer,(heightBuffer * allyIndex) + heightAddon,characterSize,characterSize,0),"allies"));
        }
        console.log(enemyData)
        //load all enemies
        for (let enemyIndex = 0; enemyIndex < enemyData.length;enemyIndex++){
            battlefield.enemies.push(new entity(enemyDirectory[enemyData[enemyIndex]],new vector2D(enemyXBuffer,(heightBuffer * enemyIndex) + heightAddon,characterSize,characterSize,0),"enemies"));
        }

        battlefield.state = battleStates.PLAYER_SELECTION;
        changeGameState("Battle");
    },

    update(deltaTime){
        if (battlefield.state === battleStates.INACTIVE) {return;}
        if (dodgeHandler.active) {
            dodgeHandler.update(deltaTime);
        }
        AnimationManager.update(deltaTime);
        battleUI.update(deltaTime);

        if (battlefield.state === battleStates.PLAYER_SELECTION) {
            let allReady = battlefield.allies.every(ally => ally.selectedAction.subcategory);
            battleUI.state.action = "player";
            if (allReady) {setState(battleStates.TURN_WAITING); console.log("all ready"); }
        }
        //check battle state and fire one-time functions then, otherwise, TURN_WAITING should do nothing
    },

    draw(){

        let renderQueue = [];

        //DRAW ALL CHARACTERS
        //draw the background first


        for (let ally in battlefield.allies) {
            ctx.drawImage(availableAssets.images[battlefield.allies[ally].image],
                battlefield.allies[ally].worldData.x - battleCamera.x,
                battlefield.allies[ally].worldData.y - battleCamera.y,
                150,
                150
            );
        }

        for (let enemy in battlefield.enemies) {
            ctx.drawImage(availableAssets.images[battlefield.enemies[enemy].image],
                battlefield.enemies[enemy].worldData.x - battleCamera.x,
                battlefield.enemies[enemy].worldData.y - battleCamera.y,
                150,
                150
            );
        }

        //DRAW UI ON TOP
        battleUI.draw();
    }

}
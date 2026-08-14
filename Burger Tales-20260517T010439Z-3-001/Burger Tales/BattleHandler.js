//this script handles ALL THINGS battle related

import {
    actionDirectory,
    dodgeHandler,
    AnimationManager,
    playerActionDirectory,
    itemHandlerBattle
} from "./actionDirectory.js";
import {allyDirectory, healthBarColor} from "./AllyDirectory.js";
import {availableAssets, playMusic} from "./AssetLoader.js";
import {gameState, changeGameState} from "./main.js";
import  {enemyDirectory} from "./enemyDirectory.js";
// import { signal } from "./SignalService.js";
import {world } from "./WorldHandler.js";
import {clamp, shakeEffect, newWrappedText, cameraBehavior} from "./Utility.js"
import {
    newImage,
    newRect,
    newText,
    randInt,
    damageCounter,
    newRotatedRect,
    newTargetHighlight,
    newFilledText,
    LERP,
} from "./Utility.js";
import {keys, keybinds, keyPresses} from "./KeyboardInputHandler.js";
import {playerController, playerInventory} from "./PlayerController.js";
import {itemDirectory} from "./ItemDirectory.js";
import {tweenService} from "./TweenService.js";
import {gameWidth, gameHeight} from "./main.js";
import {attackMinigames} from "./actionDirectory.js";
import {dialogue} from "./dialogueClass.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

export const allyXBuffer = 320;
export const enemyXBuffer = 1450;
export const heightBuffer = 250;
export const characterSize = 150;
export const heightAddon = 250;

const dialogueBoxWidth = 800;
const dialogueBoxHeight = 200;
const dialogueBoxX = (1920/2) - (dialogueBoxWidth / 2);
const dialogueBoxTextSize  = 26;
const dialogueBoxY = 30;

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

const highlightBox = {x:470,y:0,width: 120, height: 50 }; // lives across frames

function getMainMenuRect(index) {
    const spacing = 150, startX = 470;
    return { x: startX + index * spacing, y: 0, width: 120, height: 50 };
}

// --- the one-shot trigger ---

function moveHighlightTo(targetRect) {
    const info = tweenService.TweenInfo(0.18, "CubicOut");
    const tween = tweenService.create(highlightBox, info, {
        x: targetRect.x,
        width: targetRect.width
    });
    tween.play(); // fires exactly once, right here — no flags needed
}

export let battleCamera = {
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    target: null,

    follow(t) {
        battleCamera.target = t;
    },

    update(dt) {
        if (battleCamera.target) {
            const targetCenterX = battleCamera.target.x + (battleCamera.target.width / 2);
            const targetCenterY = battleCamera.target.y + (battleCamera.target.height / 2);

            // desired camera position = target's center, offset so it lands in the middle of the screen
            const desiredX = targetCenterX - (canvas.width / (2 * battleCamera.zoom));
            const desiredY = targetCenterY - (canvas.height / (2 * battleCamera.zoom));

            battleCamera.x = LERP(battleCamera.x, desiredX, 0.1);
            battleCamera.y = LERP(battleCamera.y, desiredY, 0.1);
        }
    },
}

export let playerTeam = ["Cobalt","Illumine","Cobalt"];//TEMPORARY

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

    constructor(stats,vectorData,side,teamIndex) {
        this.worldData = new vector2D(vectorData.x,vectorData.y,vectorData.width,vectorData.height,vectorData.rotation);
        this.maxStats = stats;//this contains original stats, sometimes we will have modifiers that change max stats at runtime so this is why we need this
        this.health = {current: stats.health, max:stats.health};
        this.defense = {current: stats.defense, max:stats.defense};
        this.attack = {current: stats.attack, max:stats.attack};
        this.energy = {current: stats.energy, max:stats.energy};
        this.speed = {current: stats.speed, max:stats.speed};
        this.actions = [];
        this.other = [];
        this.name = stats.name;
        this.image = stats.image;
        this.teamIndex = teamIndex;
        this.side = side;
        this.stats = [];
        if (side === "allies") {
            this.selectedAction = {
                category : "",
                subcategory : "",
                target : "",
            };
            this.selectedMoveInstance = null;
        }



        if (side === "enemies" && stats?.pattern){
            this.pattern = stats?.pattern;
        }

        for (let action of stats.actions) {
            // this.offensive[action] = actionDirectory[action]
            this.actions.push(action);
        }

        this.logic = stats?.logic //allies should have this as undefined; the ally controller has a unique edge case for that
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

    CREATE_TURN_ORDER: "CREATE_TURN_ORDER",
    PLAYER_SELECTION: "PLAYER_SELECTION",//this is where players select each ally to do something
    // the turn order is hidden in this state, the player has to assume that their allies go in said order

    TURN_START : "TURN_START",
    TURN_WAITING:"TURN_WAITING",//while a function is running, just focus on updating the deltas of said functions

    BATTLE_WIN : "BATTLE_WIN",//victory  condition
    BATTLE_LOST : "BATTLE_LOST",//lose condition
}

export let battlefield = {
    turnOrder : [],

    allies : [],
    enemies : [],

    cycle : 0,
    turn : 1,

    backgroundData : [],

    previousState : battleStates.INACTIVE,
    state : battleStates.INACTIVE,
    stateInfo : {},//metadata to prevent massive enums
    itemIndexBuffer:[],//keep index of items to delete next cycle (this was really annoying to deal with)

    newEntity(entityName,side,stats,vectorData){
        this[side].push(new entity(entityName,side,stats,vectorData));
    },

    rest(side,entity){ //just allows said entity to regain energy

    },

    //UTILITY FUNCTIONS TO USE IN A BATTLE
    //careful not to modify the "target" argument or else it won't reassign the original, passed parameter

    grant(target,amount,stat){
        if (target[stat].current + amount > target[stat].max) {
            target[stat].current = target[stat].max;
        } else {
            target[stat].current += amount
        }
    },

    take(target,amount,stat){
        if (target[stat].current - amount < 0) {
            target[stat].current = 0;
        } else {
            target[stat].current -= amount;
        }
    },

    damage(target,amount){
        let damage = (amount - target.defense.current)
        if (damage < 0) {damage = clamp(0,amount,damage);}
        if (damage !== 0) {new shakeEffect(target?.worldData,15,0.5);}
        if (damage !== 0 && target.side === "allies") {
            availableAssets.sounds.OO_Hurt.play({volume:1.5});
        }
        target.health.current-=  damage;
        //labelCreator
        new damageCounter(damage,target.worldData.x + (target.worldData.width/2),target.worldData.y + (target.worldData.height/2));

        //if the target's hp ends up being 0, try to find their turn in the turn order and get rid of it


        // new damageCounter(amount,target.worldData.x + (target.worldData.width/2),target.worldData.y + (target.worldData.height/2),"rgb("+randInt(1,255)+","+randInt(1,255)+","+randInt(1,255)+",");
    },

    debuff(target,amount){

    },

    buffs(target,amount){

    },

    createTurns() {
        this.turnOrder = [];

        for (let a in this.allies) {
            this.turnOrder.push({name:this.allies[a].name,index: a,spd:this.allies[a].speed.current, side:"allies"});
        }

        for (let e in this.enemies) {
            this.turnOrder.push({name:this.enemies[e].name, index: e,spd:this.enemies[e].speed.current, side:"enemies"});
        }

        //also precompute enemy logic blocks i guess

        this.turnOrder.sort((a, b) => b.spd - a.spd);
    },

    //as soon as we call this, we offload control to actionDirectory.js
    grantTurn() {
        //check if all enemies are downed or all allies are downed
        let alliesDowned = 0;
        let enemiesDowned = 0;

        for (let ally of battlefield.allies) {if (ally.health.current <= 0) {alliesDowned++;}}
        for (let enemy of battlefield.enemies) {if (enemy.health.current <= 0) {enemiesDowned++;}}

        if (alliesDowned === battlefield.allies.length) {setState(battleStates.BATTLE_LOST);return;} else if (enemiesDowned === battlefield.enemies.length) {setState(battleStates.BATTLE_WIN);return;}


        let newCycle = false

        if (this.turn > this.turnOrder.length) {
            this.cycle++;
            this.turn = 1;
            newCycle = true;

            for (let item of this.itemIndexBuffer) {playerInventory.splice(item,1);}
            this.itemIndexBuffer = [];
            battleUI.itemsInUse = [];

            setState(battleStates.PLAYER_SELECTION);
            return;
            //we are reconstructing the turn order every new CYCLE btw
        }

        // //apply buffs and debuffs or take them away if needed
        // for (let a in this.allies) {
        //     for (let buff in this.allies[a]) {
        //         if (buff && (buff.triggerTime === "turn" || (buff.triggerTime === "cycle" && newCycle))) {
        //             //trigger the effect first, then take away from it's duration (remove if needed)
        //             buff.trigger();
        //             buff.duration-=1;
        //             if (buff.duration <= 0) {
        //                 //take away effect and remove
        //                 buff.undo();
        //                 delete this.allies[a][buff];
        //             }
        //         }
        //     }
        // }

        if (battlefield[this.turnOrder[this.turn-1].side][this.turnOrder[this.turn-1].index].health.current <= 0) {
            this.turn++;
            this.grantTurn();
        } else {
            battlefield[this.turnOrder[this.turn-1].side][this.turnOrder[this.turn-1].index]?.logic();
            setState(battleStates.TURN_WAITING); //the entity's execute logic should trigger the next turn
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


const mainUIIndexes = ["Action","Item","Defend"];

export let battleUI = {//this purely handles ui which is drawn over everything,

    renderQueue : [],
    battleBoxText : "",
    errorMessage:"",
    itemsInUse:[],
    state : {
        targetType : "none",
        action : "none",
        menuStack : [{name:"main",maxIndex:3,curIndex:0}],
        allyIndex : 0,
        instance:null,
        currentSelection : null,
    },

    incrementAllyIndex(){
        if (this.state.allyIndex + 1 <= battlefield.allies.length-1) {
            this.state.allyIndex++;
        } else {
            setState(battleStates.CREATE_TURN_ORDER);
            this.state.allyIndex=0;
            this.state.action = "idle"
        }
        this.state.menuStack = [{name:"main", maxIndex:3, curIndex:0}];
        moveHighlightTo(getMainMenuRect(0));
    },

    update(deltaTime) {
        if (battlefield.allies[this.state.allyIndex].health.current <= 0) {
            this.incrementAllyIndex();
        }
        let curMenu = this.state.menuStack[this.state.menuStack.length - 1];
        if (battlefield.state === battleStates.PLAYER_SELECTION) {
            if (keyPresses[keybinds.Interact]) {
                availableAssets.sounds.OO_Click.play();
                if (this.errorMessage!=="") {
                    return;
                }
                //TOP HIERARCHY; MAIN MENU
                if (this.state.allyIndex <= battlefield.allies.length - 1) {
                    let curAllyInBattle = battlefield.allies[this.state.allyIndex];
                    let currentMenuName = this.state.menuStack[this.state.menuStack.length-1].name;
                    if (currentMenuName === "main") {
                        if (mainUIIndexes[curMenu.curIndex] === "Action") {
                            //find all of that ally's moves
                            this.state.menuStack.push({name: "actions",maxIndex: curAllyInBattle.actions.length,curIndex:0});
                        } else if (mainUIIndexes[curMenu.curIndex] === "Other") {
                            this.state.menuStack.push({name: "other",maxIndex: curAllyInBattle.other.length,curIndex:0});
                        } else if (mainUIIndexes[curMenu.curIndex] === "Defend") {
                            curAllyInBattle.logic = () => {
                                battlefield.grant(curAllyInBattle,12,"energy")
                                new damageCounter(12,curAllyInBattle.worldData.x + (curAllyInBattle.worldData.width/2),curAllyInBattle.worldData.y + (curAllyInBattle.worldData.height/2),"rgb(255,188,49,1)");
                                battleUI.battleBoxText = curAllyInBattle.name + " took a defensive stance and gained a little energy back!"

                                setTimeout(()=>{
                                    battlefield.turn++;
                                    setState(battleStates.TURN_START);
                                },2000);

                            };
                            this.incrementAllyIndex();
                        } else if (mainUIIndexes[curMenu.curIndex] === "Item") {
                            //look through the player's inventory (playerController)
                            this.state.menuStack.push({name:"item",maxIndex:playerInventory.length,curIndex:0});
                        }
                    } else if (currentMenuName === "actions") {
                        if (curAllyInBattle.energy.current - playerActionDirectory[curAllyInBattle.actions[curMenu.curIndex]].cost <0) {
                            //error out they cannot use the attack
                            this.errorMessage = "This move costs more energy than you have! Try to defend to get some back";
                        } else {
                            this.state.targetType = playerActionDirectory[curAllyInBattle.actions[curMenu.curIndex]].targetType;
                            this.state.instance = playerActionDirectory[curAllyInBattle.actions[curMenu.curIndex]];
                            this.state.menuStack.push({name:"target",maxIndex:battlefield[this.state.targetType].length,curIndex:0});
                        }
                    }  else if (currentMenuName === "item") {
                        for (let itemIndex = 0; itemIndex < this.itemsInUse.length; itemIndex++) {
                            if (this.itemsInUse[itemIndex].itemIndex === this.state.menuStack[this.state.menuStack.length-1].curIndex) {
                                this.errorMessage = "Another ally is already using this item!";
                                return;
                            }
                        }
                        console.log(this.state.menuStack[this.state.menuStack.length-1].curIndex);
                        if (this.errorMessage === "") {
                            availableAssets.sounds[itemDirectory[playerInventory[this.state.menuStack[this.state.menuStack.length-1].curIndex]]?.sound].play();
                            this.state.targetType = itemDirectory[playerInventory[this.state.menuStack[this.state.menuStack.length-1].curIndex]]?.targetType;
                            this.state.menuStack.push({name:"target",maxIndex:battlefield[this.state.targetType].length,curIndex:0});
                        }


                        // availableAssets.sounds[itemDirectory[playerInventory[this.state.menuStack[this.state.menuStack.length-1].curIndex]]?.sound].play();
                    } else if (currentMenuName === "target") {
                        let designatedTarget = battlefield[this.state.targetType][this.state.menuStack[this.state.menuStack.length-1].curIndex];
                        //check what the previous state before the target was
                        if (this.state.menuStack[this.state.menuStack.length-2].name === "actions") {
                            let selectedAction = curAllyInBattle[ this.state.menuStack[this.state.menuStack.length-2].name ][ this.state.menuStack[this.state.menuStack.length-2].curIndex];
                            curAllyInBattle.selectedMoveInstance = playerActionDirectory[selectedAction];
                            curAllyInBattle.logic = () => playerActionDirectory[selectedAction].execute(curAllyInBattle, designatedTarget,this.state.targetType);

                            if (curAllyInBattle[this.state.menuStack[this.state.menuStack.length-2].name].length > 0) {}
                        } else if (this.state.menuStack[this.state.menuStack.length-2].name === "item") {
                            //specifically search the player's inventory and rid of the item as they are one time use (splice)

                            let selectedItem = itemDirectory[playerInventory[this.state.menuStack[this.state.menuStack.length-2].curIndex]];
                            let ind = (this.state.menuStack[this.state.menuStack.length-2].curIndex);

                            curAllyInBattle.logic = () => {
                                new itemHandlerBattle("item",selectedItem.targetType,ind,curAllyInBattle,designatedTarget)/////////////////////////////////////////////////// king jong un master of goon
                            }
                            this.itemsInUse.push({allyIndex:this.state.allyIndex,itemIndex:ind});
                            // playerInventory.splice(playerInventory[this.state.menuStack[this.state.menuStack.length-2].curIndex],1);
                        }
                        //THIS IS THE FINAL CONFIRMATION STEP!
                        //MOVE UP THE ALLY INDEX AND RESET MENU STACK TO THE DEFAULT!
                        this.incrementAllyIndex();
                    }
                }
            } else if (keyPresses[keybinds.MenuNavigationLeft]) {
                availableAssets.sounds.navigation.play();
                this.errorMessage = "";
                if (this.state.menuStack[this.state.menuStack.length - 1].curIndex - 1 >= 0) {this.state.menuStack[this.state.menuStack.length - 1].curIndex--;if (curMenu.name === "main") moveHighlightTo(getMainMenuRect(curMenu.curIndex));}
            } else if (keyPresses[keybinds.MenuNavigationRight]) {
                availableAssets.sounds.navigation.play();
                this.errorMessage = "";
                if (this.state.menuStack[this.state.menuStack.length - 1].curIndex  < this.state.menuStack[this.state.menuStack.length - 1].maxIndex-1) {this.state.menuStack[this.state.menuStack.length - 1].curIndex++;if (curMenu.name === "main") moveHighlightTo(getMainMenuRect(curMenu.curIndex));}
            } else if (keyPresses[keybinds.MenuBack]) {
                availableAssets.sounds.back.play();
                this.errorMessage = "";
                //return to parent block, but if null, do nothing
                if (this.state.allyIndex > 0 && this.state.menuStack.length ===1) {
                    this.state.allyIndex--;
                    for (let itemInd = 0; itemInd < this.itemsInUse.length; itemInd++) {
                        if (this.itemsInUse[itemInd].allyIndex === this.state.allyIndex) {
                            this.itemsInUse.splice(itemInd, 1);
                        }
                    }
                    this.state.menuStack = [{name:"main", maxIndex:3, curIndex:0}];
                    battlefield.allies[this.state.allyIndex].selectedMoveInstance = null;

                    moveHighlightTo(getMainMenuRect(0));
                }
                if (this.state.menuStack.length > 1) {
                    this.state.menuStack.pop();
                }
            }
        }

    },

    draw(){
        let currentMenuName = this.state.menuStack[this.state.menuStack.length-1].name
        let curMenu = this.state.menuStack[this.state.menuStack.length-1];
        //ALWAYS DRAW HEALTH AND ENERGY BELOW EACH ENTITY
        //draw a red/green box that keeps track of how many debuffs/buffs an entity has, the player can click on them to view what they are
        if (this.state.action === "player") {
            let currentAlly = battlefield.allies[this.state.allyIndex];

            if (currentMenuName === "main") {

                // the moving highlight — reads whatever x/width the tween currently has, mid-animation or not
                let highlight = newRect("mainMenuHighlight", highlightBox.x, highlightBox.y, highlightBox.width, highlightBox.height, "rgba(255,255,255,0.35)");
                highlight.draw();

                // all 4 labels, computed fresh from layout, no persistence needed
                for (let i = 0; i < mainUIIndexes.length; i++) {
                    highlightBox.y = currentAlly.worldData.y+45;
                    let rect = getMainMenuRect(i);
                    let label = newText("mainMenuLabel"+i, rect.x + 10, currentAlly.worldData.y + 85, "rgb(0,255,255)", "16px Arial", mainUIIndexes[i]);
                    label.draw();
                }

                //TWEEN THE ABOVE TO MOVE TOWARD THE POSITION FROM A STARTING POINT


            } else if (currentMenuName === "actions") {
                // newText("currentActionSelection",currentAlly.worldData.x + 150,currentAlly.worldData.y + 50 + 16,"rgb(255,255,255)","16px Arial",battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]).draw();

                // newRect("allyOutline",currentAlly.worldData.x - 10,currentAlly.worldData.y - 10,170,170,"rgb(0,255,255)",true,10).draw();

                newRect("bx",(gameWidth/2) -400,(gameHeight/2)-200,800,400,"rgb(88,37,105)").draw();
                newRect("bx2",(gameWidth/2) -400,(gameHeight/2)-200,800,80,"rgb(25,15,72)").draw();
                let curSelection = this.state.menuStack[this.state.menuStack.length-1].curIndex
                for (let attackIndex=0;attackIndex<currentAlly.actions.length;attackIndex++){
                    newRect("m",((gameWidth/2) -400) + (80*attackIndex),(gameHeight/2)-200,80,80,curSelection === attackIndex ? "rgb(88,37,105)":"rgb(25,15,72)").draw();
                    ctx.drawImage(availableAssets.images[playerActionDirectory[battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]].image],
                        ((gameWidth/2) -400) + (80*attackIndex),(gameHeight/2)-200,80,80);
                }
                newText("desc_battle",(gameWidth/2) -400 + 20,(gameHeight/2)-100,"rgb(255,255,255)","30px Courier New", battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]).draw();
                newText("desc_battle",(gameWidth/2) -400 + 20,(gameHeight/2)-60,"rgb(255,255,255)","30px Courier New", "Energy Cost: "+ playerActionDirectory[battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]].cost).draw();
                newWrappedText("desc_battle",(gameWidth/2) -400 + 20,(gameHeight/2)-20,760,"rgb(255,255,255)","30px Courier New", playerActionDirectory[battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]].description).draw();

                let energyPreview = battlefield.allies[this.state.allyIndex].energy.current - playerActionDirectory[battlefield.allies[this.state.allyIndex].actions[this.state.menuStack[this.state.menuStack.length-1].curIndex]].cost;
                let ally = battlefield.allies[this.state.allyIndex]
                newTargetHighlight("bruh",ally.worldData.x,ally.worldData.y+ally.worldData.height+45,150* (energyPreview/ally.energy.max),20).draw();
                // newRect("allyHPBar_"+ai,ally.worldData.x,ally.worldData.y+ally.worldData.height+45,150* (ally.energy.current/ally.energy.max),20, "rgb(225,198,88)").draw()


            } else if (currentMenuName === "target") {
                let tt = newText("jw",currentAlly.worldData.x + 250,currentAlly.worldData.y + 50 + 16,"rgb(255,255,255)","16px Arial","yo target someone twin");
                tt.draw();
                let targetPos = battlefield[this.state.targetType][this.state.menuStack[this.state.menuStack.length-1].curIndex].worldData;
                newTargetHighlight("th",targetPos.x, targetPos.y, 150, 150,2).draw();


            } else if (currentMenuName === "item") {
                // newFilledText("jw",currentAlly.worldData.x + 150,currentAlly.worldData.y + 50 + 16,"rgb(255,255,255)","26px Arial","item menu placeholder").draw();
                let curSelection = this.state.menuStack[this.state.menuStack.length-1].curIndex

                newRect("bx",(gameWidth/2) -400,(gameHeight/2)-200,800,400,"rgb(105,81,37)").draw();
                newRect("bx2",(gameWidth/2) -400,(gameHeight/2)-200,800,80,"rgb(72,45,15)").draw();
                for (let itemIndex=0; itemIndex < playerInventory.length; itemIndex++) {
                    if (curSelection === itemIndex) {
                        newRect("m",((gameWidth/2) -400) + (80*itemIndex),(gameHeight/2)-200,80,80,"rgb(105,81,37)").draw();
                    }
                    ctx.drawImage(availableAssets.images[playerInventory[itemIndex]],(gameWidth/2)+ (80*itemIndex) -400,(gameHeight/2)-200,80,80)
                }

                for (let itemIndex=0; itemIndex < this.itemsInUse.length; itemIndex++) {
                    newRect("m",((gameWidth/2) -400) + (80*this.itemsInUse[itemIndex].itemIndex),(gameHeight/2)-200,80,80,"rgba(0,0,0,0.49)").draw();
                }

                newText("itemName",(gameWidth/2) -400 + 20,(gameHeight/2)-90,"rgb(255,255,255)","30px Courier New",playerInventory[curSelection]).draw();
                newWrappedText("itemDescription",(gameWidth/2) -380,(gameHeight/2)+20,760,"rgb(255,255,255)","35px Courier New",itemDirectory[playerInventory[this.state.menuStack[this.state.menuStack.length-1].curIndex]].description).draw();

                // newTargetHighlight("highlight_item",(gameWidth/2) -380,(gameHeight/2)+(curSelectio * 80))
            }
        }

        if (this.errorMessage) {
            newRect("bgRect",dialogueBoxX,900-36,dialogueBoxWidth,150,"rgb(0,0,0)").draw();
            newWrappedText("errorMessage",dialogueBoxX,900,dialogueBoxWidth,"rgb(255,255,255)","36px Courier new",this.errorMessage).draw();
        }

        newRect("dialogueBoxBG",dialogueBoxX-5,dialogueBoxY-5,dialogueBoxWidth+10,dialogueBoxHeight+10,"rgb(0,0,0)",false,0,true).draw();
        newRect("dialogueBoxBG",dialogueBoxX,dialogueBoxY,dialogueBoxWidth,dialogueBoxHeight,"rgb(218,203,166)",false,0,true).draw();

        newWrappedText("dialogueBoxText",dialogueBoxX + 10,dialogueBoxY + dialogueBoxTextSize + 10,dialogueBoxWidth,"rgb(0,0,0)",dialogueBoxTextSize+"px Courier New",this.battleBoxText).draw();

        //draw all hp and energy bars for allies, do not draw energy bars for enemies however
    },
}

export function setState(newState) {
    battlefield.state = newState;
}

export let battle = {

    //initializes the whole field and updates game state + screen state
    start( enemyData ,area, backgroundData) {
        //area determines battle music unless enemy overrides it, it also determines bg
        let worldArea = world.locations[area];
        playMusic(worldArea?.battleMusic ?? "SPAWN",{volume:0.3});
        cameraBehavior.curCam = "battle";

        //load all allies
        for (let allyIndex=0; allyIndex < playerTeam.length;allyIndex++) {
            battlefield.allies.push(new entity(allyDirectory[playerTeam[allyIndex]],new vector2D(allyXBuffer,(heightBuffer * allyIndex) + heightAddon,characterSize,characterSize,0),"allies",allyIndex));
        }
        //load all enemies
        for (let enemyIndex = 0; enemyIndex < enemyData.length;enemyIndex++){
            battlefield.enemies.push(new entity(enemyDirectory[enemyData[enemyIndex]],new vector2D(enemyXBuffer,(heightBuffer * enemyIndex) + heightAddon,characterSize,characterSize,0),"enemies",enemyIndex));
        }

        battleUI.battleBoxText = "You started a fight!";

        battlefield.state = battleStates.PLAYER_SELECTION;

        if (backgroundData) {
            console.log(backgroundData);
            for (let index = 0; index < backgroundData.length; index++) {
                battlefield.backgroundData.push(backgroundData[index]);
            }
        }

        changeGameState("Battle");
    },

    clear() {
        battlefield.allies = [];
        battlefield.enemies = [];
        battlefield.turnOrder = [];
        battlefield.backgroundData = [];
        battlefield.turn = 0;
        battlefield.cycle = 1;
        battleCamera.x = 0;
        battleCamera.y = 0;
        battleCamera.zoom = 1;
        cameraBehavior.curCam = "none";
    },

    update(deltaTime){
        if (battlefield.state === battleStates.INACTIVE) {return;}
        dodgeHandler.update(deltaTime)
        AnimationManager.update(deltaTime);
        battleUI.update(deltaTime);
        battleCamera.update(deltaTime);

        if (battlefield.state === battleStates.PLAYER_SELECTION) {
            let allReady = battlefield.allies.every(ally => ally.selectedAction.subcategory);
            battleUI.state.action = "player";
        } else if (battlefield.state === battleStates.CREATE_TURN_ORDER) {
            battlefield.createTurns();
            setState(battleStates.TURN_START);
        } else if (battlefield.state === battleStates.TURN_START) {
            battlefield.grantTurn();
        } else if (battlefield.state === battleStates.TURN_WAITING) {
            attackMinigames.updateCurrentMinigames(deltaTime);
            itemHandlerBattle.currentItems[0]?.update(deltaTime);

            //We do not need to do this for enemies since Animation manager technically handles their choreographs
        } else if (battlefield.state === battleStates.BATTLE_LOST) {
            console.log("UOI LOST");
        } else if (battlefield.state === battleStates.BATTLE_WIN) {
            console.log("UOI WIN");

            setState(battleStates.TURN_WAITING);
            battleUI.battleBoxText = "You won! You gained No XP and Gold because that doesn't even exist yet...";
            tweenService.create(battleCamera,tweenService.TweenInfo(2,"SineOut"),{x:-50,y:-50,zoom:1.1}).play();
            setTimeout(()=>{
                this.clear();
                changeGameState("World");
                playerController.state = "active";
            },5000);

        }

        damageCounter.update(deltaTime);
        //check battle state and fire one-time functions then, otherwise, TURN_WAITING should do nothing
    },

    draw(){

        let renderQueue = [];

        //DRAW ALL CHARACTERS
        //draw the background first

        for (let bgE of battlefield.backgroundData) {
            if (bgE.rectangle) {
                newRect("BG_"+bgE.name,bgE.x,bgE.y,bgE.width,bgE.height,bgE.color).draw();
            } else {
                ctx.drawImage(availableAssets.images[bgE.image],
                    (bgE.x- battleCamera.x) * battleCamera.zoom,
                    (bgE.y  - battleCamera.y) * battleCamera.zoom,
                    bgE.width*battleCamera.zoom,
                    bgE.height*battleCamera.zoom);
            }
        }

        for (let ally in battlefield.allies) {
            ctx.drawImage(availableAssets.images[battlefield.allies[ally].image],
                (battlefield.allies[ally].worldData.x - battleCamera.x) * battleCamera.zoom,
                (battlefield.allies[ally].worldData.y - battleCamera.y) * battleCamera.zoom,
                characterSize * battleCamera.zoom,
                characterSize * battleCamera.zoom
            );
            // battlefield.allies[ally].draw();
        }

        for (let enemy in battlefield.enemies) {
            ctx.drawImage(availableAssets.images[battlefield.enemies[enemy].image],
                (battlefield.enemies[enemy].worldData.x - battleCamera.x) * battleCamera.zoom,
                (battlefield.enemies[enemy].worldData.y - battleCamera.y) * battleCamera.zoom,
                characterSize * battleCamera.zoom,
                characterSize * battleCamera.zoom
            );
        }
        //data bars
        for (let ei =0; ei < battlefield.enemies.length; ei++) {
            let enemy = battlefield.enemies[ei];
            newRect("enemyHPBAr_"+ei,enemy.worldData.x-5,enemy.worldData.y+(enemy.worldData.height) +10,150+10,20,"rgb(0,0,0)").draw();
            newRect("enemyHPBAr_"+ei,enemy.worldData.x,enemy.worldData.y+(enemy.worldData.height) + 15,150,10,"rgb(217,58,58)").draw();
            newRect("enemyHPBAr_"+ei,enemy.worldData.x,enemy.worldData.y+(enemy.worldData.height) + 15,clamp(0,150,150 * (enemy.health.current/enemy.health.max)),10,"rgb(47,239,101)").draw();
        }

        //player bars (only show energy when it's the player's turn)
        for (let ai=0;ai<battlefield.allies.length; ai++) {
            let ally = battlefield.allies[ai];
            newRect("allyHPBAr_"+ai,ally.worldData.x-5,ally.worldData.y+(ally.worldData.height) +10,150+10,30,"rgb(0,0,0)").draw();
            // newRect("allyHPBAr_"+ai,ally.worldData.x,ally.worldData.y+(ally.worldData.height) + 15,150,10,"rgb(217,58,58)").draw();
            newRect("allyHPBar_"+ai,ally.worldData.x,ally.worldData.y+ally.worldData.height+15,150* (ally.health.current/ally.health.max),20,healthBarColor[ally.name]).draw()
            newFilledText("allyHPText_"+ai,ally.worldData.x,ally.worldData.y+ally.worldData.height+15,"rgb(255,255,255)","20px Courier New",ally.health.current+"/"+ally.health.max).draw();
        }

        //energy bars (for player turns)
        if (battlefield.state === battleStates.PLAYER_SELECTION) {
            for (let ai=0;ai<battlefield.allies.length; ai++) {
                let ally = battlefield.allies[ai];
                newRect("allyHPBAr_"+ai,ally.worldData.x-5,ally.worldData.y+(ally.worldData.height) +40,150+10,30,"rgb(0,0,0)").draw();
                newRect("allyHPBar_"+ai,ally.worldData.x,ally.worldData.y+ally.worldData.height+45,150* (ally.selectedMoveInstance?((ally.energy.current - ally.selectedMoveInstance.cost) / ally.energy.max) :(ally.energy.current/ally.energy.max)),20, "rgb(225,198,88)").draw()
            }
        }
        battleUI.draw();
        if (battlefield.state === battleStates.PLAYER_SELECTION) {
            for (let ai=0;ai<battlefield.allies.length; ai++) {
                let ally = battlefield.allies[ai];
                newFilledText("allyHPText_"+ai,ally.worldData.x,ally.worldData.y+ally.worldData.height+45,"rgb(255,255,255)","20px Courier New","Energy: "+ (ally.selectedMoveInstance?(ally.energy.current - ally.selectedMoveInstance.cost+"/"+ally.energy.max) :(ally.energy.current+"/"+ally.energy.max) ) ).draw();
            }
        }

        //DRAW UI ON TOP
        attackMinigames.existingMinigames[0]?.draw();
        itemHandlerBattle.currentItems[0]?.draw();

        damageCounter.draw();
    }

}

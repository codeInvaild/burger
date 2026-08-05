import { tweenService } from "./TweenService.js";
import {keys, keybinds, keyPresses, keyReleases} from "./KeyboardInputHandler.js";
import {allyXBuffer, battle, battlefield, battleStates, heightAddon, heightBuffer, setState} from "./BattleHandler.js";
import { newText, newRect, randInt,shakeEffect, } from "./Utility.js";
import {gameHeight,gameWidth} from "./main.js";
import {availableAssets, playSoundEffect} from "./AssetLoader.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

export let AnimationManager = {
    timelines : [],

    create(maxDurationInSeconds) {
        let timeline = new AnimationTimeline(maxDurationInSeconds);
        this.timelines.push(timeline);
        return timeline;
    },

    update(dt) {
        this.timelines = this.timelines.filter(timeline => {//removing finished timelines from the array
            timeline.update(dt);
            return !timeline.finished;//return the inverse because we want to keep the FALSE instances
        });
    },
}

export class AnimationTimeline {
    constructor(durationSeconds) {
        this.duration = durationSeconds;
        this.time = 0;
        this.events = [];
        this.finished = false;
    }

    at(time, callback) {
        if (time > this.duration) {console.warn("Your action exceeds timeline duration by "+ (this.duration-time)+" seconds!")}
        this.events.push({
            time,
            callback,
            fired: false
        });
    }

    update(dt) {
        if (this.finished) return;

        this.time += dt;

        for (let event of this.events) {
            if (!event.fired && this.time >= event.time) {
                event.fired = true;
                event.callback();
            }
        }

        if (this.time >= this.duration) {
            this.finished = true;
        }
    }
}

let dodgeTypes = {
    MISS: 1000,
    OKAY:500,
    GOOD:350,
    GREAT:200,
    PERFECT:100,
}

function findDodge(currentTime,endTime) {
    let time = endTime - currentTime;

    // Sort thresholds from highest to lowest
    const sorted = Object.entries(dodgeTypes).sort((a, b) => b[1] - a[1]);
    for (const [label, threshold] of sorted) {
        if (value >= threshold) return label
    };
    // If it's below all thresholds, return the lowest category
    return Object.keys(sorted[sorted.length - 1][0]).toString();
}

export let dodgeHandler = {
    dodgesActive : [],
    localDelta : 0,
    debounced : false,
    active : false,
    target : "",//enemies should never need to dodge, so we always assume it's on the ally side

    queueDodge(time,cost={energy:2,GP:1},damage,modifiers=null) {
        if (!this.active) {this.active=true; this.localDelta=0;}
        this.dodgesActive.push({time : time,dodged : false,damage : damage, cost: cost, modifiers : modifiers}) ;
    },

    update (dt) {
        this.localDelta += dt*1000;

        if (keys[keybinds.Action] && !this.debounced) {//pick up on input
            this.debounced = true;
            setTimeout(()=> {this.debounced=false},50)

            let dodge = findDodge(this.localDelta,this.dodgesActive[0].time);//we now have what type of dodge it is

            //take away energy and add up GP
            battlefield.allies[this.target].take("energy",this.dodgesActive[0].cost?.energy);

            //handle the dodge here!

            battlefield.allies[this.target].take("health",
                dodge === "PERFECT" ? 0 :
                    dodge === "GREAT" ? this.dodgesActive[0].damage*0.25 :
                        dodge === "GOOD" ? this.dodgesActive[0].damage*0.5 :
                            dodge === "OKAY" ? this.dodgesActive[0].damage*0.75 :
                                dodge === "MISS" ? this.dodgesActive[0].damage : 0

            );

            this.dodgesActive[0].dodged = true;
        }

        if (this.localDelta >= this.dodgesActive[0].time) {
            let removedElement = this.dodgesActive.shift();
            this.localDelta -= removedElement.time;
        }
        if (this.dodgesActive.length === 0) {
            this.active = false;
        }
    },

    draw(){
        newRect("dodgeRect",400,800,500,300,"rgb(255,255,255)").draw();
        newText("dodgeText", 400,800,"rgb(0,0,0)","40px Courier New","press "+keybinds.Action+" to dodge! Be wary of your GP and energy however!").draw();



    },
}

//ACTIONS LOOK FOR A BATTLEFIELD INSTANCE, NOT A DIRECTORY REFERENCE
//these are mostly one-off functions meant for one entity each
export let actionDirectory = {//THESE ARE USED FOR DODGING
    fight : {
        cost : 1,
        execute : function(target,targetSide){
            dodgeHandler.target = target;
            dodgeHandler.queueDodge(1, {energy:0,GP:1},6);
            let timeline = AnimationManager.create(6);
            timeline.at(0.5,() => {
                tweenService.create(battlefield[targetSide][target].worldData, tweenService.TweenInfo(1,"SineOut"),{x:400}).play();
            });
        },
        targetType : "enemies",
    }
}

export let playerActionDirectory = {
    slash : {
        cost : 5,
        execute : function(self,target,targetSide){
            console.log("successfully triggered")
            console.log(self);
            tweenService.create(self.worldData,tweenService.TweenInfo(1,"SineOut"),{x:target.worldData.x - (self.worldData.width + 20), y:target.worldData.y}).play();
            setTimeout(function(){
                let c = new attackMinigames("sword",{},self,target);
            },1000)
                //tween ally toward the enemy (stop right in from of them)
                //create a sword png, have the player holster it on their back, and swing in an arc
                //create a hold and release mechanism and determine pt bonus based on success (closer to the center of the green hit zone, the >40 pts you get)

                //create two bars; a brown and a green zone, the green zone is contained within the brown zone and size is determined by a percent modifier
                //create a red tick that sticks out on the top and bottom that the player can hold their interaction button to hold and reelase from

                //the timeline system sadly can't really work here and I also need some way for this to get input whilst animate
        },
        targetType : "enemies",
    },
    wack : {
        cost : 5,
        execute : function(self,target,targetSide){
            console.log("successfully triggered")
            tweenService.create(self.worldData,tweenService.TweenInfo(0.5,"ElasticOut"),{x:self.worldData.x + 100}).play();
            setTimeout(function(){
                let c = new attackMinigames("spell",{},self,target);
            },250)
            //tween ally toward the enemy (stop right in from of them)
            //create a sword png, have the player holster it on their back, and swing in an arc
            //create a hold and release mechanism and determine pt bonus based on success (closer to the center of the green hit zone, the >40 pts you get)

            //create two bars; a brown and a green zone, the green zone is contained within the brown zone and size is determined by a percent modifier
            //create a red tick that sticks out on the top and bottom that the player can hold their interaction button to hold and reelase from

            //the timeline system sadly can't really work here and I also need some way for this to get input whilst animate


        },
        targetType : "enemies",
    },
    hammer : {

    },
    bow : {

    }
}

export class attackMinigames {
    static existingMinigames = [];
    static updateCurrentMinigames(deltaTime) {attackMinigames.existingMinigames[0]?.update(deltaTime);}; //ONLY ONE SHOULD BE ACTIVE AT A TIME

    constructor(name, modifiers,self,target){
        this.update = null;
        switch (name) {
            case "sword":
                this.objects = {
                    tickWidth : 10,
                    tickHeight:100,
                    tickX : 820,
                    tickY : 800,
                    tickColor : "rgb(255,0,0)",
                    tickSpeed: modifiers?.tickSpeed ?? 12,

                    boxWidth : 600,
                    boxHeight : 100,
                    boxX: (gameWidth/2) - 300,
                    boxY : 800,
                    boxColor : "rgb(37,77,125)",

                    boxOutlineSize : 5,

                    padAreaWidth: modifiers?.padAreaWidth ?? 70,
                    padAreaHeight:100,
                    padAreaX: modifiers?.padAreaX ?? randInt(800 + (modifiers?.padAreaWidth ?? 40),400 + 800 - (modifiers?.padAreaWidth ?? 40)),
                    padAreaY : 800,
                    padColor : "rgb(62,143,57,0.8)",

                    reverse:false,
                }
                this.update = function(deltaTime){//do not use update to draw things, it WILL NOT show up!

                    if (this.objects.tickX >= (this.objects.boxX + this.objects.boxWidth) - this.objects.tickWidth || this.objects.tickX < this.objects.boxX + this.objects.tickWidth) {
                        this.objects.reverse = !this.objects.reverse;
                    }
                    //edge case catching
                    if (this.objects.tickX >= (this.objects.boxX + this.objects.boxWidth) - this.objects.tickWidth) {this.objects.tickX = (this.objects.boxX + this.objects.boxWidth) - this.objects.tickWidth;}
                    if (this.objects.tickX <this.objects.boxX + this.objects.tickWidth) {this.objects.tickX = this.objects.boxX + this.objects.tickWidth;}

                    if (keys[keybinds.Action]) {this.objects.tickX += this.objects.reverse ? -this.objects.tickSpeed : this.objects.tickSpeed;}

                    if (keyReleases[keybinds.Action]) {//this should be when the dmg is calculated, and we give up the turn
                        if (this.objects.tickX >= this.objects.padAreaX && this.objects.tickX <= this.objects.padAreaX + this.objects.padAreaWidth) {
                            battlefield.damage(target,self.attack.current);
                        } else {
                            battlefield.damage(target,1);
                            for (let fun = 0; fun < 25;fun++) {
                                // playSoundEffect("click");
                                availableAssets.sounds["click"].play();
                                setTimeout(() => {battlefield.damage(target,fun);},100*fun);
                            }




                        }
                        tweenService.create(self.worldData,tweenService.TweenInfo(0.5,"SineOut"),{x:allyXBuffer,y:(self.teamIndex * heightAddon) + heightBuffer}).play();
                        this.objects.movingBack = true;

                        new shakeEffect(target.worldData,25,0.5);
                        attackMinigames.existingMinigames.shift();
                        battlefield.turn++;
                        setState(battleStates.TURN_START);

                    }
                };
                this.draw = function(){
                    newRect("outlineBoxBGSword",this.objects.boxX - this.objects.boxOutlineSize, this.objects.boxY - this.objects.boxOutlineSize ,this.objects.boxWidth + (this.objects.boxOutlineSize*2),this.objects.boxHeight + (this.objects.boxOutlineSize*2),"rgb(0,0,0)").draw();
                    newRect("boxBGSword",this.objects.boxX,this.objects.boxY,this.objects.boxWidth,this.objects.boxHeight,this.objects.boxColor).draw();
                    newRect("padAreaSword",this.objects.padAreaX,this.objects.padAreaY,this.objects.padAreaWidth,this.objects.padAreaHeight,this.objects.padColor).draw();
                    newRect("tickSword",this.objects.tickX - this.objects.tickWidth,this.objects.tickY,this.objects.tickWidth,this.objects.tickHeight,this.objects.tickColor).draw();
                    newText("guidance",(gameWidth/2) - 400,this.objects.boxY - 24,"rgb(255,255,255)","24px Arial","Hold and release your ACTION key when the red tick is in the GREEN area!").draw();
                }
                break;


            case "spell":
                this.objects = {

                }
                this.update = function(deltaTime){

                };
                this.draw = function(){
                    newText("guidance2",(gameWidth/2) - 650,800 - 24,"rgb(255,255,255)","24px Arial","Hold your ACTION key to move the tick right, try to keep it in the GREEN area! Let go to move it left, don't let it hit the edges").draw();
                };
                break;
            case "pirate":
                this.update = function(deltaTime){};
                break;
            case "kit" :
                this.update = function(deltaTime){};
                break;
            default:
                Error("Invalid attack minigame type given");
                break;
        }
        attackMinigames.existingMinigames.push(this);
    }

}

/*
*
* dodgeHandler is where damage is applied, DO NOT ATTEMPT TO DO IT WITHOUT IT (for enemy attacks)
* timelines are how we know at x time, when we do some visual or auditory effect
*
* */

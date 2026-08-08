import { tweenService } from "./TweenService.js";
import {keys, keybinds, keyPresses, keyReleases} from "./KeyboardInputHandler.js";
import {
    allyXBuffer,
    battle,
    battlefield,
    battleStates,
    enemyXBuffer,
    heightAddon,
    heightBuffer,
    setState
} from "./BattleHandler.js";
import {newText, newRect, randInt, shakeEffect, newRotatedRect,} from "./Utility.js";
import {gameHeight,gameWidth} from "./main.js";
import {availableAssets} from "./AssetLoader.js";

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
    MISS: 500,
    OKAY:400,
    GOOD:300,
    GREAT:200,
    PERFECT:100,
}

function findDodge(currentTime,endTime,customParameters) {
    if (dodgeHandler.dodgesActive[0].dodged) {console.log("already dodged!");return null; }
    let timeDifference = (endTime - currentTime) * 1000;//this is in MILLISECONDS, expect a high number in the thousands/hundreds

    console.log(timeDifference);

    if (timeDifference > 0 && timeDifference <= (customParameters?.PERFECT_TIMING ? customParameters?.PERFECT_TIMING : dodgeTypes.PERFECT)) {
        return "PERFECT";
    } else if ( timeDifference > (customParameters?.PERFECT_TIMING ? customParameters?.PERFECT_TIMING : dodgeTypes.PERFECT) && timeDifference <= (customParameters?.GREAT_TIMING ? customParameters?.GREAT_TIMING : dodgeTypes.GREAT)) {
        return "GREAT";
    } else if (timeDifference > (customParameters?.GREAT_TIMING ? customParameters?.GREAT_TIMING : dodgeTypes.GREAT) && timeDifference <= (customParameters?.GOOD_TIMING ? customParameters?.GOOD_TIMING : dodgeTypes.GOOD)) {
        return "GOOD";
    } else if (timeDifference > (customParameters?.GOOD_TIMING ? customParameters?.GOOD_TIMING : dodgeTypes.GOOD) && timeDifference <= (customParameters?.OKAY_TIMING ? customParameters?.OKAY_TIMING : dodgeTypes.OKAY)) {
        return "OKAY";
    } else if (timeDifference > (customParameters?.OKAY_TIMING ? customParameters?.OKAY_TIMING : dodgeTypes.OKAY) && timeDifference <= (customParameters?.MISS_TIMING ? customParameters?.MISS_TIMING : dodgeTypes.MISS)) {
        return "MISS";
    } else {
        console.log("this time didn't fit into any category "+timeDifference);
        return "NO_REG";
    }
}

export let directionTypes = {
    up:"Up",
    left:"Left",
    right:"Right",
    down:"Down",
}


//do not ever set up a dodge that happens after the animation timeline is completed, the player won't be able to guard against it
export let dodgeHandler = {
    dodgesActive : [],
    localDelta : 0,
    active : false,

    queueDodge(time,directions,target,damage,modifiers=null) {
        // if (!this.active) {this.active=true; this.localDelta=0;}
        console.log("you just queued a dodge")
        console.log("your target is: "+target?.name);
        this.dodgesActive.push({time : time,dodged : false , target: target,damage : damage, directions:directions,directionsPressed:{}, modifiers : modifiers}) ;
    },



    //perfect: 100% reduction
    //great: 75% reduction
    //okay: 25% reduction
    //miss: 0% reduction
    //
    handleDodge(curDirection,dodgeTime,totalTime,customParams) {
        let dodge = findDodge(dodgeTime,totalTime,customParams);
        if (dodge === "NO_REG") {return;}
        let curDodge = this.dodgesActive[0];
        let registerHit = true;

        console.log("Handling dodge... "+dodge);
        switch (dodge) {
            case "PERFECT":
                battlefield.damage(curDodge.target, customParams?.PERFECT_DMG_MULT ? customParams?.PERFECT_DMG_MULT : 0);
                console.log("perfect: 0");
                break;

                case "GREAT":
                    battlefield.damage(curDodge.target, customParams?.GREAT_DMG_MULT ? customParams?.GREAT_DMG_MULT : Math.floor(curDodge.damage * 0.25));
                    console.log("GREAT: "+Math.floor(curDodge.damage * 0.25));
                    break;

                    case "GOOD":
                        battlefield.damage(curDodge.target, customParams?.GOOD_DMG_MULT ? customParams?.GOOD_DMG_MULT : Math.floor(curDodge.damage * 0.5));
                        console.log("GOOD: "+Math.floor(curDodge.damage * 0.5));
                        break;

                        case "OKAY":
                            battlefield.damage(curDodge.target, customParams?.OKAY_DMG_MULT ? customParams?.OKAY_DMG_MULT : Math.floor(curDodge.damage * 0.75));
                            console.log("OKAY: "+Math.floor(curDodge.damage * 0.75));
                            break;

                            case "MISS":
                                registerHit = false;
                                console.log("you missed bruh");
                                // battlefield.damage(curDodge.target, curDodge.damage);
                                break;
        }

        if (registerHit){curDodge.directionsPressed[curDirection] = true;}
        if (Object.keys(curDodge.directionsPressed).length === Object.keys(curDodge.directions).length) {this.dodgesActive[0].dodged = true;}
    },

    update (dt) {
        if (this.dodgesActive.length === 0) {return;}
        console.log(dt);
        this.localDelta += dt;

        //each needs to check for if it was the correct input or part of it (multi-hits), just compare with this.dodgesActive[0]'s direction array
        if (keyPresses[keybinds.Up]) {
            let found = this.dodgesActive[0]?.directions?.Up;
            if (found) {
                this.handleDodge("Up",this.localDelta,this.dodgesActive[0].time,this.dodgesActive[0]?.modifiers);
            } else {
                availableAssets.sounds["OO_Miss"].play();
            }
        }

        if (keyPresses[keybinds.Down]) {
            let found = this.dodgesActive[0]?.directions?.Down;
            if (found) {
                this.handleDodge("Down",this.localDelta,this.dodgesActive[0].time,this.dodgesActive[0]?.modifiers);
            } else {
                availableAssets.sounds["OO_Miss"].play();
            }
        }

        if (keyPresses[keybinds.Left]) {
            let found = this.dodgesActive[0]?.directions?.Left;
            if (found) {
                this.handleDodge("Left",this.localDelta,this.dodgesActive[0].time,this.dodgesActive[0]?.modifiers);
            } else {
                availableAssets.sounds["OO_Miss"].play();
            }
        }

        if (keyPresses[keybinds.Right]) {
            let found = this.dodgesActive[0]?.directions?.Right;
            if (found) {
                this.handleDodge("Right",this.localDelta,this.dodgesActive[0].time,this.dodgesActive[0]?.modifiers);
            } else {
                availableAssets.sounds["OO_Miss"].play();
            }
        }


        if (this.localDelta >= this.dodgesActive[0].time) {
            if (!this.dodgesActive[0].dodged) {//count as a missed dodge
                battlefield.damage(this.dodgesActive[0].target, this.dodgesActive[0].damage);
            }
            let removedElement = this.dodgesActive.shift();
            this.localDelta = 0;
        }
    },

    draw(){
        newRect("dodgeRect",400,800,500,300,"rgb(255,255,255)").draw();
        newText("dodgeText", 400,800,"rgb(0,0,0)","40px Courier New","press a corresponding MOVEMENT KEY to dodge at the right time!").draw();
    },
}

export class enemyActions {//mostly use this for any special edge cases, but a lot of the times for extra props if u wanna use this for multiple enemies but different visual effects
    static existingEA = [];

    constructor(name, modifiers, self, target) {
        this.name = name;
        this.modifiers = modifiers;
        this.self = self;
        this.target = target;

        switch (name) {
            case "":
                this.update = {

                };

                break;
        }
    }
}

//ACTIONS LOOK FOR A BATTLEFIELD INSTANCE, NOT A DIRECTORY REFERENCE
//these are mostly one-off functions meant for one entity each
export let actionDirectory = {//THESE ARE USED FOR DODGING
    fight : {
        cost : 1,
        execute : function(self,target,targetSide){
            availableAssets.sounds.getReady.play();
            dodgeHandler.target = target;
            //the two lines of code below are an example of the BS you have to do, after one dodge, SUBTRACT from whatever time that was to get your next designated time
            dodgeHandler.queueDodge(2, {Right:directionTypes.right},target,self.attack.current);
            dodgeHandler.queueDodge(3, {Right:directionTypes.right},target,self.attack.current);//I want it to happen at timeline.at = 5, so 5-2 = 3
            let timeline = AnimationManager.create(6);
            timeline.at(1,() => {
                tweenService.create(self.worldData, tweenService.TweenInfo(1,"SineOut"),{x:target.worldData.x + 75,y:target.worldData.y}).play();
            });

            timeline.at(3,()=>{
                tweenService.create(self.worldData, tweenService.TweenInfo(0.5,"SineOut"),{x:target.worldData.x + 550}).play();
            })

            timeline.at(4.5,()=>{
                tweenService.create(self.worldData, tweenService.TweenInfo(0.5,"Linear"),{x:target.worldData.x + 75}).play();
            })

            timeline.at(6,()=>{
                tweenService.create(self.worldData, tweenService.TweenInfo(0.5,"SineOut"),{x:enemyXBuffer,y: heightBuffer + (self.teamIndex * heightAddon) }).play();
                setTimeout(nextTurn(),1500);
            })
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

function nextTurn() {
    attackMinigames.existingMinigames.shift();
    enemyActions.existingEA.shift();
    setTimeout(function(){
        battlefield.turn++;
        setState(battleStates.TURN_START);
    },1000);
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
                            // for (let fun = 0; fun < 75;fun++) {
                            //     setTimeout(() => {battlefield.damage(target,fun);availableAssets.sounds["gp"].play({ playbackRate: 0.1 + Math.random() * 3 });},100*fun);
                            // }
                        }
                        tweenService.create(self.worldData,tweenService.TweenInfo(0.5,"SineOut"),{x:allyXBuffer,y:(self.teamIndex * heightAddon) + heightBuffer}).play();
                        this.objects.movingBack = true;
                        self.execute = null;
                        new shakeEffect(target.worldData,25,0.5);
                        nextTurn();

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
                    tickWidth : 10,
                    tickHeight:100,
                    tickX : 820,
                    tickY : 800,
                    tickColor : "rgb(255,0,0)",
                    tickSpeed: modifiers?.tickSpeed ?? 20,
                    tickDecay:modifiers?.tickDecay ?? 30,

                    boxWidth : 600,
                    boxHeight : 100,
                    boxX: (gameWidth/2) - 300,
                    boxY : 800,
                    boxColor : "rgb(37,77,125)",

                    completionWidth : 300,
                    completionHeight : 100,
                    completionX: (gameWidth/2) - 150,
                    completionY : 600,
                    completionColor : "rgb(47,239,101)",

                    boxOutlineSize : 5,

                    padAreaWidth: modifiers?.padAreaWidth ?? 150,
                    padAreaHeight:100,
                    padAreaX: modifiers?.padAreaX ?? randInt(800 + (modifiers?.padAreaWidth ?? 40),400 + 800 - (modifiers?.padAreaWidth ?? 40)),
                    padAreaY : 800,
                    padColor : "rgb(62,143,57,0.8)",

                    totalDuration:4,
                    fillTime:1,
                    currentFill:0,

                }
                this.update = function(deltaTime){
                    let object = this.objects;
                    if (object.tickX >= object.padAreaX && object.tickX <= object.padAreaX + object.padAreaWidth) {
                        object.currentFill+=deltaTime;
                    }

                    if (object.currentFill >= object.fillTime) {//grant the highest bonus
                        battlefield.damage(target,100);
                        new shakeEffect(target.worldData,25,0.5);
                        self.execute = null;
                        nextTurn()
                    }

                    if (keys[keybinds.Action]) {
                        object.tickX+=object.tickSpeed;
                    } else {
                        object.tickX-= object.tickDecay;
                    }

                    if (object.tickX >= object.boxX+object.boxWidth) {
                        object.tickX=object.boxX+object.boxWidth;
                    }
                    if (object.tickX <= object.boxX) {
                        object.tickX=object.boxX;
                    }

                };
                this.draw = function(){
                    newRect("boxBGStaff",this.objects.boxX,this.objects.boxY,this.objects.boxWidth,this.objects.boxHeight,this.objects.boxColor).draw();
                    newRect("padAreaStaff",this.objects.padAreaX,this.objects.padAreaY,this.objects.padAreaWidth,this.objects.padAreaHeight,this.objects.padColor).draw();
                    newRect("tickStaff",this.objects.tickX - this.objects.tickWidth,this.objects.tickY,this.objects.tickWidth,this.objects.tickHeight,this.objects.tickColor).draw();
                    newRect("staffCompletion",this.objects.completionX,this.objects.completionY,this.objects.completionWidth * (this.objects.currentFill/this.objects.fillTime),this.objects.completionHeight,this.objects.completionColor).draw();
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

import { tweenService } from "./TweenService.js";
import  { keys, keybinds } from "./KeyboardInputHandler.js";
import { battlefield } from "./BattleHandler.js";
import { newText, newRect } from "./Utility.js";

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
        }
    }
}

export let playerActionDirectory = {
    sword : {
        cost : 5,
        execute : function(target,targetSide){
            let timeline = AnimationManager.create(6);
            timeline.at(0.5,() => {
                //tween ally toward the enemy (stop right in from of them)
                //create a sword png, have the player holster it on their back, and swing in an arc
            })
        }
    },
    staff : {

    },
    hammer : {

    },
    bow : {

    }
}


/*
*
* dodgeHandler is where damage is applied, DO NOT ATTEMPT TO DO IT WITHOUT IT
* timelines are how we know at x time, when we do some visual or auditory
*
* */
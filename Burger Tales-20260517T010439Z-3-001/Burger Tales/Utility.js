import {battlefield} from "./BattleHandler.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

export let renderedShapes = {}

export const LERP = (a,b,t) => a + (b-a) * t

export function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizeVector(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

    if (length === 0) {return { x: 0, y: 0 };}

    return {x: vector.x / length, y: vector.y / length};
}

export const DotProduct = (vectorA, vectorB) => (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y)

export function intersects(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export function newRect(id,x,y,width,height,color,outline=false,lineWidth=3) {
    renderedShapes[id] = {X:x,Y:y,Width:width,Height:height,Color:color,Outline:outline,LineWidth:lineWidth, draw: function (){
        if (outline) {
            ctx.strokeStyle = renderedShapes[id].Color;
            ctx.lineWidth = renderedShapes[id].LineWidth;
            ctx.strokeRect(renderedShapes[id].X,renderedShapes[id].Y,renderedShapes[id].Width,renderedShapes[id].Height);
        } else {
            ctx.fillStyle = renderedShapes[id].Color;
            ctx.fillRect(renderedShapes[id].X,renderedShapes[id].Y,renderedShapes[id].Width,renderedShapes[id].Height)
        }
    }};
    return renderedShapes[id];
}

export function newImage(id,x,y,width,height,image) {
    renderedShapes[id] = {X:x,Y:y,Width:width,Height:height, draw: function (){
        ctx.drawImage(image,x,y,width,height,image);
    }};
    return renderedShapes[id];
}

export function newText(id,x,y,color="rgb(255,255,255)",font = "16px Arial",text = "hello!") {
    renderedShapes[id] = {X:x,Y:y,Color:color,Font : font, Text : text, draw : function(){
            ctx.font = renderedShapes[id].Font;
            ctx.lineWidth = 8;
            // ctx.strokeStyle = "black";
            // ctx.strokeText(renderedShapes[id].Text, x, y);
            ctx.fillStyle = renderedShapes[id].Color;
            ctx.fillText(renderedShapes[id].Text, renderedShapes[id].X, renderedShapes[id].Y);
        }}
    return renderedShapes[id];
}

export function newFilledText(id,x,y,color="rgb(255,255,255)",font = "16px Arial",text = "hello!") {
    renderedShapes[id] = {X:x,Y:y,Color:color,Font : font, Text : text, draw : function(){
            ctx.font = renderedShapes[id].Font;
            ctx.lineWidth = 8;
            ctx.strokeStyle = "black";
            ctx.strokeText(renderedShapes[id].Text, x, y);
            ctx.fillStyle = renderedShapes[id].Color;
            ctx.fillText(renderedShapes[id].Text, renderedShapes[id].X, renderedShapes[id].Y);
        }}
    return renderedShapes[id];
}

export class shakeEffect {
    static shakes = []
    static update = function(deltaTime){
        for (let shakeIndex =0;shakeIndex < shakeEffect.shakes.length; shakeIndex++) {
            let curShake = shakeEffect.shakes[shakeIndex];
            curShake.elapsedTime += deltaTime;

            let proportionalElapsed = curShake.elapsedTime / curShake.duration;
            let actualShakeMag = curShake.decay ? (1 - proportionalElapsed) * curShake.magnitude: curShake.magnitude

            curShake.object.x = curShake.data.originalX + randInt(-actualShakeMag, actualShakeMag);
            curShake.object.y = curShake.data.originalY + randInt(-actualShakeMag, actualShakeMag);
            if (curShake.elapsedTime >= curShake.duration) {
                curShake.object.x = curShake.data.originalX;
                curShake.object.y = curShake.data.originalY;
                shakeEffect.shakes.splice(shakeIndex,1);
                break;
            }
        }
    };

    constructor(object,magnitude,duration, decay = true) {
        this.data = {
            originalX:object?.x,
            originalY:object?.y,
        }
        this.decay = decay;
        this.object = object;
        this.magnitude = magnitude;
        this.elapsedTime = 0;
        this.duration = duration;
        shakeEffect.shakes.push(this);
    }
}

export class damageCounter {
    static counter = 0;
    static allCounters = [];
    static globalDurationSec = 1.5;

    static maths = {
        //total accumulated distance: 105px
        firstRadius:30, //IN PIXELS
        secondRadius:20,
        thirdRadius:5,
        fourthRadius:2,
        clampingAngle:180, //degrees
    }

    static update(deltaTime) {
        for (let counterIndex = 0; counterIndex < damageCounter.allCounters.length; counterIndex++) {
            let curCount = damageCounter.allCounters[counterIndex];
            curCount.elapsedTime += deltaTime;
            if (curCount.elapsedTime > damageCounter.globalDurationSec) {damageCounter.allCounters.splice(counterIndex, 1);}
            //first 2/4ths of the animation should be dedicated to the bounce anim, the last 1/4 should be it static and fading out linearly
            //the 3/4 mark should just be the number static, nothing happening to it
            let percentDone = curCount.elapsedTime / damageCounter.globalDurationSec;
            if (percentDone <= 0.5) {//halfway
                //bounce from the origin point
                let subPercent = percentDone / 0.5;
                if (subPercent <= 0.25) {
                    //use the firstRad as a ref

                    let radians =  Math.PI * (subPercent/0.25);

                    curCount.x = curCount.startX + (this.maths.firstRadius * (1 + Math.cos( (Math.PI - radians) )) );
                    curCount.y = curCount.startY +this.maths.firstRadius * Math.sin(-radians);

                } else if (subPercent <= 0.5) {
                    //use the secondRad as a ref
                    let radians =  (Math.PI * ((subPercent-0.25)/0.25));

                    curCount.x = (this.maths.firstRadius *2) + curCount.startX + ( this.maths.secondRadius * (1 + Math.cos(Math.PI -radians)) ) ;
                    curCount.y = curCount.startY +this.maths.secondRadius * Math.sin(-radians);

                } else if (subPercent <= 0.75) {
                    //use the thirdRad as a ref
                    let radians =  Math.PI * ((subPercent-0.5)/0.25);
                    curCount.x = ((this.maths.firstRadius +this.maths.secondRadius) * 2) + ( curCount.startX +this.maths.thirdRadius * (1 + Math.cos(Math.PI -radians)) ) ;
                    curCount.y = curCount.startY +this.maths.thirdRadius * Math.sin(-radians);
                } else {
                    let radians =  Math.PI * ((subPercent-0.75)/0.25);
                    curCount.x = ((this.maths.firstRadius +this.maths.secondRadius +this.maths.thirdRadius) * 2) + (curCount.startX +this.maths.fourthRadius * (1 + Math.cos(Math.PI -radians)));
                    curCount.y = curCount.startY +this.maths.fourthRadius * Math.sin(-radians);
                }

            } else if (percentDone <= 0.75) {
                //third quarter, stay still and do nothing. Let the player see the number
            } else {
                let lastPercentile = percentDone - 0.75;
                curCount.colorAlpha = 1-(lastPercentile /0.25)
            }
            if (percentDone >=1) {damageCounter.allCounters.splice(counterIndex, 1);}





        }
    }
    static draw() {
        for (let counterIndex = 0; counterIndex < damageCounter.allCounters.length; counterIndex++) {
            let curCount = damageCounter.allCounters[counterIndex];
            newFilledText(curCount.name,curCount.x,curCount.y,curCount.color+curCount.colorAlpha+")","36px Arial",curCount.amount).draw();

            // newText(curCount.name,curCount.startX,curCount.startY,curCount.color,"26px Arial",curCount.amount).draw();
        }
    }

    constructor(amount,startX,startY,colorOverride ) {
        this.amount = amount;
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.currentDegree = 0;
        this.color = colorOverride  ? colorOverride : "rgb(255,255,255,";
        console.log(colorOverride);
        console.log(this.color);
        this.colorAlpha = 1;
        damageCounter.counter++;
        this.name = "damageCounter_"+damageCounter.counter;
        this.elapsedTime = 0;
        // console.log("created new damage counter  " + startX);
        damageCounter.allCounters.push(this);
    }
}


export function drawAllShapes() {for (const shape in renderedShapes) {renderedShapes[shape].draw()}}

export let scenePool = {};

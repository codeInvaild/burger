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



export function drawAllShapes() {for (const shape in renderedShapes) {renderedShapes[shape].draw()}}

export let scenePool = {};

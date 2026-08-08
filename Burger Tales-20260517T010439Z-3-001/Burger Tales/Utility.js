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


export function clamp(min, max,value) {
    return Math.max(min,Math.min(value,max));
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

export function drawCircle(ctx, x, y, radius, options = {}) {
    const {
        fill = null,
        stroke = null,
        lineWidth = 1,
    } = options;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

export function newTargetHighlight(id, x, y, width, height, pulseSpeed = 3) {
    renderedShapes[id] = {
        X: x, Y: y, Width: width, Height: height, PulseSpeed: pulseSpeed,
        draw: function () {
            const s = renderedShapes[id];
            const pulse = Math.abs(Math.sin(performance.now() / 1000 * s.PulseSpeed));
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = "white";
            ctx.fillRect(s.X, s.Y, s.Width, s.Height);
            ctx.restore();
        }
    };
    return renderedShapes[id];
}

export function newAreaTint(id, color, opacity, blendMode = "multiply") {
    renderedShapes[id] = {
        Color: color, Opacity: opacity, BlendMode: blendMode,
        draw: function () {
            const s = renderedShapes[id];
            ctx.save();
            ctx.globalCompositeOperation = s.BlendMode;
            ctx.globalAlpha = s.Opacity;
            ctx.fillStyle = s.Color;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.restore();
        }
    };
    return renderedShapes[id];
}

export function hashStringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % 1000;
    }
    return hash;
}

const lightCanvas = document.createElement("canvas");
lightCanvas.width = 1920;
lightCanvas.height = 1080;
const lightCtx = lightCanvas.getContext("2d");

const lightMaskCache = new Map(); // avoids rebuilding this every frame

function getLightMask(color, radius) {
    const key = `${color}_${radius}`;
    if (lightMaskCache.has(key)) return lightMaskCache.get(key);

    const size = radius * 2;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = size;
    maskCanvas.height = size;
    const mctx = maskCanvas.getContext("2d");

    // Step 1: pure white falloff — no hue involved, so no ring possible
    const gradient = mctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    mctx.fillStyle = gradient;
    mctx.beginPath();
    mctx.arc(radius, radius, radius, 0, Math.PI * 2);
    mctx.fill();

    // Step 2: stamp the real color in, keeping the mask's alpha shape exactly
    mctx.globalCompositeOperation = "source-in";
    mctx.fillStyle = color;
    mctx.fillRect(0, 0, size, size);

    lightMaskCache.set(key, maskCanvas);
    return maskCanvas;
}

const punchMaskCache = new Map();
function getPunchMask(radius) {
    if (punchMaskCache.has(radius)) return punchMaskCache.get(radius);

    const size = radius * 2;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = size;
    maskCanvas.height = size;
    const mctx = maskCanvas.getContext("2d");

    const gradient = mctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    mctx.fillStyle = gradient;
    mctx.beginPath();
    mctx.arc(radius, radius, radius, 0, Math.PI * 2);
    mctx.fill();

    punchMaskCache.set(radius, maskCanvas);
    return maskCanvas;
}

function getFlickerMultiplier(seed, time, speed = 8, intensity = 0.15) {
    const n1 = Math.sin(time * speed + seed);
    const n2 = Math.sin(time * speed * 2.7 + seed * 3.1); // second wave breaks up perfect periodicity
    const combined = n1 * 0.6 + n2 * 0.4; // roughly -1 to 1
    return 1 + combined * intensity; // e.g. 0.85 to 1.15
}

export function newLightingLayer(id, ambientDarkness = 0.85, options = {}) {
    const {
        maxDarkness = 1,       // cap so it's never fully pitch black
        darknessColor = "0,0,10", // slightly blue-black instead of pure black — reads better
    } = options;

    renderedShapes[id] = {
        AmbientDarkness: ambientDarkness,
        MaxDarkness: maxDarkness,
        DarknessColor: darknessColor,
        Lights: [],        // { x, y, radius, color } — subtractive, punches through darkness
        AdditiveLights: [],// { x, y, radius, color } — additive, brightens even lit areas
        draw: function () {
            const s = renderedShapes[id];
            lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);

            const clampedDarkness = Math.min(s.AmbientDarkness, s.MaxDarkness);
            const time = performance.now() / 1000;

            function getFlickerValues(light) {
                if (!light.flicker) return { radius: light.radius, alpha: 1 };
                const speed = light.flicker.speed ?? 8;
                const intensity = light.flicker.intensity ?? 0.15;
                const seed = light.flicker.seed ?? 0;
                const flick = getFlickerMultiplier(seed, time, speed, intensity);
                return { radius: light.radius * flick, alpha: flick };
            }

            if (clampedDarkness > 0) {
                lightCtx.globalCompositeOperation = "source-over";
                lightCtx.fillStyle = `rgba(${s.DarknessColor},${clampedDarkness})`;
                lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

                // punch: pushed much closer to full strength, so the "reveal" is the dominant visual effect
                lightCtx.globalCompositeOperation = "destination-out";
                for (const light of s.Lights) {
                    const { radius: drawRadius, alpha: flickerAlpha } = getFlickerValues(light);
                    const intensity = Math.min(light.intensity ?? 1, 1);
                    const mask = getPunchMask(light.radius);
                    lightCtx.globalAlpha = flickerAlpha * intensity; // no more 0.75 cap — let it actually clear
                    lightCtx.drawImage(mask, light.x - drawRadius, light.y - drawRadius, drawRadius * 2, drawRadius * 2);
                }
                lightCtx.globalAlpha = 1;

                ctx.save();
                ctx.globalCompositeOperation = "multiply";
                ctx.drawImage(lightCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }

// tint: small and subtle — a warm/cool cast concentrated near the source, not a wash over the whole reveal
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (const light of [...s.Lights, ...s.AdditiveLights]) {
                const { radius: drawRadius, alpha: flickerAlpha } = getFlickerValues(light);
                const intensity = light.intensity ?? 0.9;
                const tintRadius = drawRadius * 0.6; // noticeably smaller than the punch radius
                const mask = getLightMask(light.color, light.radius);
                ctx.globalAlpha = flickerAlpha * intensity * 0.25; // much lower — accent, not the main event
                ctx.drawImage(mask, light.x - tintRadius, light.y - tintRadius, tintRadius * 2, tintRadius * 2);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        },
        reset: function () {
            lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
            this.Lights = [];
            this.AdditiveLights = [];
        }
    };
    return renderedShapes[id];
}


export function newRotatedRect(id,x,y,width,height,color,rotation) {
    renderedShapes[id] = {X:x,Y:y,Width:width,Height:height,Rotation:rotation,Color:color,draw:function(){
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
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
            ctx.fillStyle = renderedShapes[id].Color;
            ctx.strokeText(renderedShapes[id].Text, x, y);

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
            // curCount.colorAlpha = 1
            let percentDone = curCount.elapsedTime / damageCounter.globalDurationSec;
            if (percentDone <= 0.5) {//halfway
                //bounce from the origin point
                let subPercent = percentDone / 0.5;
                if (subPercent <= 0.25) {
                    //use the firstRad as a ref

                    let radians =  Math.PI * (subPercent/0.25);
                    // curCount.colorAlpha = subPercent/0.25;
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

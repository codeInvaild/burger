let startTime = Date.now();
import {assetCount, assets, availableAssets, loadAsset} from './AssetLoader.js';
import { tweenService } from './TweenService.js';
import { playerController, camera } from "./PlayerController.js";
import { world } from "./WorldHandler.js";
import {newText, renderedShapes, shakeEffect} from "./Utility.js"
import { dialogue } from "./dialogueClass.js"
import { battle, battlefield } from "./BattleHandler.js";
import  { mouse } from "./MouseInputHandler.js";
import  {keyPressUpdate} from "./KeyboardInputHandler.js";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;

export let gameState = "World"

export function changeGameState(newState) {gameState = newState;}

export const gameWidth = 1920;
export const gameHeight = 1080;

// canvas.width  = 1200;
// canvas.height = 800;
canvas.width  = gameWidth;
canvas.height = gameHeight;

camera.width  = canvas.width; //override canvas buffer
camera.height = canvas.height;



console.log("CANVAS WIDTH: "+canvas.width);
console.log("HEIGHT: "+canvas.height);

mouse.init(canvas);

// let music = loadAsset("music",assets.music.bling,"bling");

function draw(dt) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); //clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // if (availableAssets.music.bling) {availableAssets.music.bling.play()}

    if (gameState === "World") {
        world.draw();
        dialogue.update(dt);
    } else if (gameState === "Battle") {
        battle.draw();
    }
    // for (let img in availableAssets.images) {
    //     if (availableAssets.images[img]) {
    //         ctx.drawImage(availableAssets.images[img], playerController.x, playerController.y, canvas.width/2, canvas.height/2);
    //     }
    // }
    // ctx.drawImage(availableAssets.images["title"], sprite.x, sprite.y, canvas.width/6, canvas.height/6);
    // console.log(playerController.image);
    // if (availableAssets.images[playerController.image]) {
    //
    //     ctx.drawImage(availableAssets.images[playerController.image], (playerController.x) - (camera.x), (playerController.y) - (camera.y), 150, 150);
    // } else {
    //     // console.log("idk where your image went")
    // }
    let fps = newText("fps_counter",800,120,"rgb(255,255,255)","60px Monospace","FPS: "+ Math.ceil(1/dt) );
    fps.draw()
}


let sprite = {
    x:0,
    y:0,
}

const twe = tweenService.create(sprite, tweenService.TweenInfo(2,"ElasticOut"),{x:400});
twe.play();


function update(dt) {//this is for operations that need to use deltaTime, all coupled into one function; NEEDS TO HAPPEN BEFORE THE DRAW CALL
    tweenService.update(dt);
}

function loop() {//MAIN GAME HAPPENS HERE
    const deltaTime = Math.min((Date.now() - lastTime) / 1000 , 0.05); //max 50 ms delay
    lastTime = Date.now();

    // if (Object.keys(keys).length > 0) {
    //     console.log(keys);
    // }


    update(deltaTime);
    shakeEffect.update(deltaTime);
    // TweenService.update(deltaTime);

    if (gameState === "Start") { //we want to handle specific update functions accordingly to each game state
        //this only triggers once to show the player the game menu and gives them the option to load save files
    } else if (gameState === "Menu") {
        //this is for examining your inventory, maps, characters, and saving
    } else if (gameState === "World") {
        world.update(deltaTime);
    } else if (gameState === "Battle") {
        battle.update(deltaTime);
    }
    draw(deltaTime);

    keyPressUpdate();
    requestAnimationFrame(loop);
}

let allAssets = Object.keys(assets.images).length + Object.keys(assets.music).length;

console.log(allAssets);

for (let img in assets.images) { //wait for the game assets to initialize
    console.log(img);
    loadAsset("images",assets.images[img], img).then(() => {
        if (assetCount === allAssets) {loop()}
    })
}

for (let mus in assets.music) {
    console.log(mus);
    loadAsset("music",assets.music[mus], mus).then(()=>{
        if (assetCount === allAssets) {loop()}
    });
}

console.log("we took "+(Date.now() - startTime)+" ms to initialize");

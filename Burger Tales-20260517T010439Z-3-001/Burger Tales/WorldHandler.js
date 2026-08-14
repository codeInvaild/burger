import {assets, availableAssets, playMusic} from "./AssetLoader.js"
import { playerController, camera } from "./PlayerController.js"
import {intersects, newAreaTint, newRect,hashStringToSeed} from "./Utility.js";
import { dialogue } from "./dialogueClass.js"
import { dialogueDirectory } from "./dialogueDirectory.js"
import { battle } from "./BattleHandler.js"
import {newLightingLayer, renderedShapes} from "./Utility.js";

export let location = "Woodrock_Southern_Entrance";

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const tileset = {
    0 : {
        name: "grass",
        collision: false,
        image: "grass",
        overlap: 1, //this specifies what tile this tile overlaps
    },
    1 : {
        name: "dirt",
        collision: false,
        image: "dirt",
    },
    2 : {
        name: "water",
        collision: false,
        image: "water",
    }
}

/*
* how to format the world locations?
*
* You WANT the Tilemap to be square (this specific shape helps with optimization)
* Exit zones determine when we load in another section
* The width and height are determined by the Tilemap, any Areas outside will throw you an error to enforce optimal rendering
* Each tile = 100 px
* */

class areaObject {

    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

function autoTiler(tilemap, parentName) {
    if (world.precomputedTileName === parentName) {return world.precomputedTileset}
    //Loop through every instance of said tiles, checking their neighbors
    //assign each tile a specific tile type correlated to their open directions
    //neighboring tiles of same type will "connect" as represented by specific case tiles (NW, East, West variants and so on...)
    //update precomputedTileset to easily reuse this auto-tiled map every frame

    world.precomputedTileset = [];
    world.precomputedTileName = parentName;

    //THIS IS TEMPORARY AS AUTO TILING IS TEDIOUS
    for (let y = 0; y < tilemap.length; y++) {
        const row = [];
        for (let x = 0; x < tilemap[y].length; x++) {
            const tileId = tilemap[y][x];
            row.push(tileset[tileId].image);
        }
        world.precomputedTileset.push(row);
    }
    return world.precomputedTileset;
}

const TILE_SIZE = 100;

export let world = {
    currentLocation: location,
    precomputedTileName : "",
    precomputedTileset : [], //will resemble tileset, but will instead be filled with file names. computed once, use forever
    precomputedTilesetNeighbors : {
        Left: [],
        Right: [],
        Down : [],
        Up : [],
    }, //neighboring world tiles, will be empty if player is not preloading

    locations : {
        "Woodrock_Southern_Entrance" : {
            Tilemap: [
                [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2], //20 x 16
            ],
            LightLevel: 2,
            Music: "dark_sanct",
            battleMusic : "SPAWN",
            Areas: [//DRAWN FROM Y-PRIORITY, DO NOT CARE FOR HOW YOU ORDER THEM
                {id : "guy", image: "man", imageData : {x:600, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "stealer"}},
                {id : "guy", image: "angry_man", imageData : {x:500, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "Angry_man"}},
                {id : "guy", image: "man", imageData : {x:400, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "dog"}},
                {id : "guy", image: "man", imageData : {x:300, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "Iris_1"}},
                {id : "guy", image: "man", imageData : {x:100, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {battle : {enemies : ["grass_dweller","grass_dweller","grass_dweller"], backgroundData: [{name:"sky",x:-100,y:-100,width:1920*1.5,height:1080*1.5,image:"sky"},{name:"grass",rectangle:true,x:-500,y:300,width:2920,height:2080,color:"rgb(39,129,95)"}] }}},
                {id: "tree1", image: "tree2", imageData : {x:200,y:200,width:300,height:300}, collisionData: {x:150,y:0,width:100,height:100}},
            ],
            Foliage : [//high level foliage

            ],
            Next: {
                Left : "Woodrock_Plaza",
                Right : "waterTest",
            },
        },
        "Woodrock_Plaza" : {
            Tilemap: [
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,2,2,2,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0], //16 x 16
            ],
            Music : "dark_sanct",
            LightLevel:0.1,
            Tint: {color:"rgb(31,89,234)",opacity:0.8},
            Areas: [
                {id : "guy", image: "man", imageData : {x:600, y:500,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "aiden"}},
                {id : "wom", image: "woman", imageData : {x:800, y:500,width:150, height:150},collisionData: {x:0,y:0,width:130,height:150}, interaction: {dialogue : "textTester"}},
                {id : "lamp", image:"cornball",imageData: {x:400,y:800,width: 100,height:150},collisionData: {x:0,y:0,width:100,height:150},brightness:0.4,lightColor:"rgb(234,48,31)",lightRadius:200},
                {id : "lamp", image:"lampPost",imageData: {x:900,y:800,width: 100,height:150},collisionData: {x:0,y:0,width:100,height:150},brightness:0.3,lightColor:"rgb(255,255,255)",lightRadius:200,lightFlicker:true},
            ],
            Next: {
                Right : "Woodrock_Southern_Entrance",
            },
        },
        "waterTest" : {
            Tilemap: [
                [2,2,2,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1],
                [2,2,2,0,1],
                [2,2,2,0,1],
            ],
            Music : "second_sanct",
            Tint:{color:"rgb(59,34,124)",opacity:0.7},
            LightLevel:0.5,
            Areas: [
                {id : "window_1",image:"window",imageData:{x:200,y:-350,width:150,height:250}},
                {id : "window_2",image:"window",imageData:{x:500,y:-350,width:150,height:250}},
                {id : "window_3",image:"window",imageData:{x:800,y:-350,width:150,height:250}},
                {id : "window_4",image:"window",imageData:{x:1100,y:-350,width:150,height:250}},
                {id : "window_5",image:"window",imageData:{x:1400,y:-350,width:150,height:250}},
                {id : "window_6",image:"window",imageData:{x:1700,y:-350,width:150,height:250}},
                {id : "window_7",image:"window",imageData:{x:2000,y:-350,width:150,height:250}},
                {id : "window_8",image:"window",imageData:{x:2300,y:-350,width:150,height:250}},
                {id : "window_9",image:"window",imageData:{x:2600,y:-350,width:150,height:250}},
                {id : "guy", image: "man", imageData : {x:600, y:400,width:150, height:150},collisionData: {x:0,y:0,width:150,height:150}, interaction: {dialogue : "guy"}},
                {id : "wom", image: "woman", imageData : {x:800, y:350,width:150, height:150},collisionData: {x:0,y:0,width:130,height:150}, interaction: {dialogue : "textTester"}},
            ],
            Next: {
                Left:"Woodrock_Southern_Entrance",
            },
        }
    },


    update(deltaTime) {//we are updating player position within the world and telling the player what they can interact with
        playMusic(world.locations[location].Music,{fadeSeconds:2,loop:true});



        let mapWidth = (world.locations[location].Tilemap[0].length) * TILE_SIZE;  // columns
        let mapHeight = (world.locations[location].Tilemap.length) * TILE_SIZE;    // rows
        let locationExited = "null";
        if (playerController.centerX > mapWidth) {
            locationExited = "Right";
        } else if (playerController.centerX < 0) {
            locationExited = "Left";
        } else if (playerController.centerY < 0) {
            locationExited = "Up";
        } else if (playerController.centerY > mapHeight) {
            locationExited = "Down";
        }

        if (locationExited !== "null" && world.locations?.[world.locations[location].Next[locationExited]]) {
            location = world.locations[location].Next[locationExited];
            let mapWidth = (world.locations[location].Tilemap[0].length) * TILE_SIZE;  // columns
            let mapHeight = (world.locations[location].Tilemap.length) * TILE_SIZE;    // rows
            playerController.x = locationExited === "Left" ? (mapWidth) - (playerController.width) :
                locationExited === "Right" ? 0 : playerController.x;
            playerController.y = locationExited === "Down" ? 0 : locationExited === "Up" ? mapHeight + playerController.height : playerController.y;
        }

        playerController.update(deltaTime);
    },

    draw() {//we will get what to draw from the update function

        let currentLightsources = [];


        const mapWidth = (world.locations[location].Tilemap[0].length) * TILE_SIZE;  // columns
        const mapHeight = (world.locations[location].Tilemap.length) * TILE_SIZE;    // rows

        let map = autoTiler(world.locations[location].Tilemap , location);
        camera.update(playerController,map,TILE_SIZE);

        //these values essentially precompute aabb bounds, to optimize the for loops
        const startTileX = Math.max(0,Math.floor(camera.x / TILE_SIZE)); //floor it to ensure we get the precise start
        const startTileY = Math.max(0,Math.floor(camera.y / TILE_SIZE));

        const endTileX = Math.min(map[0].length-1, Math.ceil((camera.x + camera.width) / TILE_SIZE));
        const endTileY = Math.min(map.length-1, Math.ceil((camera.y + camera.height) / TILE_SIZE));

        for (let tileY = startTileY; tileY <= endTileY; tileY++) {
            for (let tileX = startTileX; tileX <= endTileX; tileX++) {
                const tile = map[tileY]?.[tileX];
                if (!tile) continue; //prevent hard crashes if the tile is out of bounds
                ctx.drawImage(availableAssets.images[map[tileY][tileX]], (tileX * TILE_SIZE) - camera.x , (tileY * TILE_SIZE) - camera.y, TILE_SIZE, TILE_SIZE);
            }
        }

        //This variable affects the player, entities, and area, DO NOT INCLUDE TILES OR FOREGROUND OR LIGHTS!
        let renderQueue = [];
        let collidableObjects = [];
        let interactableObjects = [];

        function getWorldColliderPosition(x,y,cx,cy,cw,ch) {
            return {
                x : x + cx,
                y : y + cy,
                width: cw,
                height: ch
            }
        }

        for (const area of this.locations[location].Areas) {
            if (intersects(area.imageData,camera)) {//we are checking if the area is visible, otherwise, don't render it (waste of resources)
                if (area.collisionData) {
                    let collisionArea = getWorldColliderPosition(area.imageData.x,area.imageData.y,area.collisionData.x,area.collisionData.y,area.collisionData.width,area.collisionData.height);
                    collidableObjects.push({collisionData: {x: collisionArea.x, y: collisionArea.y,width: collisionArea.width, height: collisionArea.height}});
                }
                if (area.interaction) {interactableObjects.push(area)}
                renderQueue.push({
                    depth : area.imageData.y + (area.imageData.height),
                    draw() {
                        ctx.drawImage(
                            availableAssets.images[area.image],
                            area.imageData.x  - camera.x,
                            area.imageData.y  - camera.y,
                            area.imageData.width,
                            area.imageData.height
                        );
                        // let col = getWorldColliderPosition(area.imageData.x,area.imageData.y,area.collisionData.x,area.collisionData.y,area.collisionData.width,area.collisionData.height);
                        // let r = newRect("a",col.x - camera.x,col.y-camera.y,col.width,col.height,"red");
                        // r.draw();
                    }
                });
            }


            // when building currentLightsources — separate radius from intensity now:
            if (area?.brightness) {
                currentLightsources.push({
                    x: (area.imageData.x + area.imageData.width/2) - camera.x,
                    y: area.imageData.y+ area.imageData.height/2 - camera.y,
                    radius: area.lightRadius ?? 150,       // no longer scaled by brightness
                    intensity: Math.min(area.brightness, 1), // 0–1, drives how strong the effect actually is
                    color: area.lightColor ?? "rgb(255,255,255)",
                    flicker: area.lightFlicker
                });
            }
        }
        //do entity sorting here

        let playerColliderPos = getWorldColliderPosition(playerController.x ,playerController.y ,playerController.collisionData.x ,playerController.collisionData.y ,playerController.collisionData.width ,playerController.collisionData.height );

        //THIS CHECKS FOR PLAYER COLLISION
        for (let obj of collidableObjects) {
            if (intersects(playerColliderPos , obj.collisionData ) ){
                const overlapX = Math.min(playerColliderPos.x + playerColliderPos.width, obj.collisionData.x + obj.collisionData.width) - Math.max(playerColliderPos.x,obj.collisionData.x);
                const overlapY = Math.min(playerColliderPos.y + playerColliderPos.height, obj.collisionData.y + obj.collisionData.height) - Math.max(playerColliderPos.y,obj.collisionData.y);

                if (overlapX < overlapY) {
                    if (playerColliderPos.x < obj.collisionData.x) {playerController.x -= overlapX}
                    else {playerController.x += overlapX}
                    playerController.velocity.x = 0;
                } else {
                    if (playerColliderPos.y < obj.collisionData.y) {playerController.y -= overlapY}
                    else {playerController.y += overlapY}
                    playerController.velocity.y = 0;
                }
            }
            //check x and y bounds of the map, bound the player to those if there aren't any TPs there
            if (playerController.centerY < 0) {playerController.y = -(playerController.height/2);}
            if (playerController.centerY > mapHeight) {playerController.y = mapHeight - (playerController.height/2);}
            if (playerController.centerX > mapWidth) {playerController.x = mapWidth - (playerController.width/2);}
            if (playerController.centerX < 0 ) {playerController.x = -playerController.width/2;}
        }

        //checking for player interactions
        let interactionBox = getWorldColliderPosition(
            playerController.x,
            playerController.y,
            playerController.interactionBox.x,
            playerController.interactionBox.y,
            playerController.interactionBox.width,
            playerController.interactionBox.height,
        );

        //this is where we find interactable objects, loop through them to see what closest object the player can interact with is
        let intersectingObjects = [];
        for (let obj of interactableObjects) {

            let objectCollider = getWorldColliderPosition(obj.imageData.x,obj.imageData.y,obj.collisionData.x,obj.collisionData.y,obj.collisionData.width,obj.collisionData.height);
            obj.worldCollision = objectCollider;
            if (intersects(interactionBox, objectCollider)) {intersectingObjects.push(obj)}
        }
        intersectingObjects.sort((a, b) => {
            const dx_a = (a.worldCollision.x + a.worldCollision.width / 2) - playerController.centerX;
            const dy_a = (a.worldCollision.y + a.worldCollision.height / 2) - playerController.centerY;
            const dx_b = (b.worldCollision.x + b.worldCollision.width / 2) - playerController.centerX;
            const dy_b = (b.worldCollision.y + b.worldCollision.height / 2) - playerController.centerY;
            return (dx_a * dx_a + dy_a * dy_a) - (dx_b * dx_b + dy_b * dy_b);
        });

        if (intersectingObjects.length > 0) {
            renderQueue.push({
                depth : Infinity,
                draw() {
                    let dialogueBoxSize = 80;
                    let interactionPrompt = newRect(intersectingObjects[0].id+"_interaction",
                        (intersectingObjects[0].imageData.x + ((intersectingObjects[0].imageData.width/2) - (dialogueBoxSize/2))) - camera.x,
                        (intersectingObjects[0].imageData.y - (dialogueBoxSize+15)) - camera.y,
                        dialogueBoxSize,
                        dialogueBoxSize,
                        "rgb(255,255,255)"
                    );
                    interactionPrompt.draw();
                }
            })
            let interactionType = Object.keys(intersectingObjects[0].interaction)[0];
            playerController.interaction = {Type : interactionType,Data : intersectingObjects[0].interaction[interactionType]};
        } else {playerController.interaction.Type="none";playerController.interaction.Data = "none";}


        if (playerController.sprintDebounce) {
            renderQueue.push({
                depth : Infinity,
                draw() {
                    let maxSprintBarSize = playerController.width + 50;
                    let sprintBarHeight = 20;
                    let sprintBar = newRect( "sprintBarPlayer",
                        playerController.x - (25) - camera.x,
                        playerController.y -  sprintBarHeight - camera.y,
                         maxSprintBarSize * (playerController.sprintTimerAccumulation / playerController.sprintTimer),
                        sprintBarHeight,
                        "rgb(255,255,255)",
                    );
                    sprintBar.draw();
                }

            })
        }

        // console.log(intersectingObjects);
        renderQueue.push({
            depth : playerController.y + (playerController.height) ,
            draw() {
                let interactionBox = newRect("box",
                    (playerController.interactionBox.x + playerController.x) - camera.x,
                    (playerController.interactionBox.y + playerController.y) - camera.y,
                    playerController.interactionBox.width,
                    playerController.interactionBox.height,
                    "blue"
                    );
                // interactionBox.draw();
                ctx.drawImage(availableAssets.images[playerController.image], (playerController.x) - (camera.x), (playerController.y) - (camera.y), playerController.width, playerController.height)
                // let col = getWorldColliderPosition(playerController.x ,playerController.y ,playerController.collisionData.x,playerController.collisionData.y,playerController.collisionData.width,playerController.collisionData.height);
                // let r = newRect("a",col.x - camera.x,col.y -camera.y,col.width,col.height,"blue");
                // r.draw();
            }
        })

        renderQueue.sort((a, b) => a.depth - b.depth);

        currentLightsources.push({x:playerController.x+(playerController.width/2)-camera.x,y: playerController.y+(playerController.height/2)-camera.y,radius:100,color:"rgb(255,0,0)",intensity:1});

        for (const item of renderQueue) {item.draw()}//where stuff actually gets drawn

        //If lighting engine is done: Draw lighting and shadow layers
        //Draw High level foliage
        const ambientDarkness = 1 - (this.locations[location].LightLevel ?? 1);
        // LightLevel 1 = fully lit (no darkness overlay), 0 = pitch black ambient.
        let lighting = renderedShapes["worldLighting"] ?? newLightingLayer("worldLighting", ambientDarkness);
        lighting.AmbientDarkness = ambientDarkness; // update in case LightLevel differs between areas
        lighting.Lights = currentLightsources;
        lighting.draw();


        //Draw UI
        if (this.locations[location]?.Tint) {
            // newAreaTint("tint","rgb(31,89,234)",0.8).draw();
            newAreaTint("tint",this.locations[location].Tint.color,this.locations[location].Tint.opacity).draw();
        }


    }
}

let size =100;
for (let i = 0; i<50; i++){
    world.locations[location].Areas.push({id : "tree"+i, image:"tree2",imageData : {x:(Math.random()*1600) - (size/2),y:(Math.random()*1600) - (size/2),width:size,height:size},color:[1,2,3]});
}

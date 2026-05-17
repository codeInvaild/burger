import {battle, battlefield} from "./BattleHandler.js";

export let enemyDirectory = {

    grass_dweller : {
        name : "grass dweller",
        image : "dirt",
        health: 15,
        defense: 1,
        attack: 9,
        energy : 20,
        speed: 4,
        offensive : ["fight"],
        other:[],
        logic : function(){
            let randomAlly = Math.floor(Math.random()*battlefield.allies.length);
            this.actions["fight"].execute(battlefield.allies[randomAlly], "allies");
        }
    },

    //TUNGSTEN CUBE ACTIONS:
    // Runover : Speeds across the screen, dealing massive damage to an ally; dealing ATK damage
    //  > If perfectly blocked, it will stun it for ONE TURN.
    // Bounce : Jumps in an arc, slamming down and hitting 3 allies at once through a shockwave; ATK/3 dmg each
    //  > If missed, it applies confusion to all affected allies
    // Gain Mass : Gains 24 defense for 1 turn (blocking most basic attacks)
    // Rev up : Gain 993 speed for 3 turns. (just guarantees it always goes first)
    tungsten_cube : {//challenges fast reactions while punishing with extremely heavy attacks
        name : "Tungsten Cube",
        image : "tungsten",
        attributes : ["double_turns"],
        health: 350,
        defense: 4,
        attack: 93,
        energy : 400, //has little downtime between attacks
        speed: 7,
        actions : ["fight"],
        logic : function(){
            let randomAlly = Math.floor(Math.random()*battlefield.allies.length);
            this.actions["fight"].execute(battlefield.allies[randomAlly], "allies");
        }
    },


    //Witch trio!

    witch_a : {
        name : "Malice",
        image : "watch",
        attributes : ["magic_res"],
        health: 45,
        defense: 0,
        attack: 9,
        energy : 40,
        speed: 5,
        actions : ["fight"],
        logic : function(){
            let randomAlly = Math.floor(Math.random()*battlefield.allies.length);
            this.actions["fight"].execute(battlefield.allies[randomAlly], "allies");
        }
    },

    witch_b : {
        name : "Maligant",
        image : "watch2",
        attributes : ["poison_res"],
        health: 55,
        defense: 0,
        attack: 5,
        energy : 40,
        speed: 5,
        actions : ["fight"],
        logic : function(){
            let randomAlly = Math.floor(Math.random()*battlefield.allies.length);
            this.actions["fight"].execute(battlefield.allies[randomAlly], "allies");
        }
    },

    witch_c : {
        name : "Massilis",
        image : "watch3",
        attributes : ["physical_res"],
        health: 35,
        defense: 2,
        attack: 12,
        energy : 40,
        speed: 6,
        actions : ["fight"],
        logic : function(){
            let randomAlly = Math.floor(Math.random()*battlefield.allies.length);
            this.actions["fight"].execute(battlefield.allies[randomAlly], "allies");
        }
    },


}
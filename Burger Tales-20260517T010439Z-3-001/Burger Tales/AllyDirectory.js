export let allyDirectory = {
    //allies do not need logic, they call on the player to do the logic for them

    /*
    * ACTIONS:
    *   Tomato: Throws a tomato at the target to attempt and humiliate them; deals ATK + 1 damage
    *   Bake : Make a pastry for an ally and heal them for 100% of Ketchup's max health
    *
    *   Harvest: Make a large harvest and heal ALL allies for half of Ketchup's max health
    * */

    Ketchup : {
        image: "ketchup", //path to an image using availableAssets
        name : "Ketchup",
        health: 40,
        defense : 6,
        attack : 4,
        energy: 24, //some actions use energy because they are stronger / enhanced
        speed : 5,
        offensive : ["attack"], //ONLY damage or debuffing moves
        other : ["harvest"],
    },

    /*
    * Actions:
    *   Sit: Gain back all energy at the cost of your next turn
    *   Power Slash : An attack that uses ATK dmg and pierces through defense
    *   Heavy Hitter : An attack dealing ATK +3 dmg
    *
    *   Chair Throw: Able to hit airborne targets
    *
    *
    * */

    Sr_Chairington : {//MAIN DAMAGE DEALER
        name : "Sir Chairington the second coming of the chair society",
        health : 80,
        defense : 10,
        attack :7,
        energy : 38,
        speed : 3,
        actions : [],
    },


    /*
    * Spells:
    *   Fireball : Basic spell that deals AoE (1) if perfectly timed, otherwise deals ATK dmg to main target
    *   Smite : Thunderbolt bruh, dealing ATK damage and possible chance to apply shock
    *
    *
    *
    *   Convince : Can force a summoned ally to execute a specific action on your behalf
    *   Kraken Entangle: Wraps a target and has a very high chance to stun them, dealing minor damage (ATK/4)
    *
    *
    *
    *
    *
    * */
    Grace : {//DEBUFFER / BUFFER
        health : 60,
        defense : 6,
        attack : 9,
        energy :30,
        speed : 5,
        actions : [],
    },
    //


    /*
    * spells:
    *   Banana Peel : Attempt to trip an opponent: if successful, has a 50% chance to confuse them and deal ATK dmg
    *   Ice Blast : Slow a target by about 3-5 speed values; deal 3 dmg flat
    *   Magic Storm : Charge up an attack that deals 600% damage
    *
    * */
    Senior_Platano : {//SUPPORT DEBUFF / AIR DAMAGE DEALER
        name : " Senior Platano the first born of the underground underdogs",
        health : 80,
        defense : 6,
        attack: 1,
        energy : 30,
        speed : 5,
        actions : [],
    },

    /*
    * Attacks:
    *   Bow: deals X atk
    *   Flurry: Deals x+2 atk in a series of 5 shots
    *
    *   Cross Shot Deals x/3 (ROUNDED)  to 3 targets, shots are wasted if there are fewer than 3 enemies on the field
    *
    * */
    Arch : { //MAIN AIR DAMAGE DEALER / SUB DPS
        health : 40,
        defense : 3,
        attack:7,
        energy : 38,
        speed : 6,
        actions : [],
    },
}



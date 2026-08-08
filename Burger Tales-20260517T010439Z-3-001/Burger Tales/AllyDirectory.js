export let healthBarColor = {
    Cobalt:"rgb(0,217,255)",
    Illumine:"rgb(231,139,106)",
}

export let allyDirectory = {
    //allies do not need logic, they call on the player to do the logic for them

    /*
    * ACTIONS:
    *   base move:
    *   Slash : deal 1x ATTACK to 1 enemy for 1 energy
    *
    *   extras:
    *   Takedown: deal 2.5x ATTACK to 1 enemy for 15 energy
    *   IronRush: Deal 1x DEFENSE type damage to 1 enemy for 10 energy, completely piercing their defense
    *   EdgeGuard: grant yourself the PARRY buff for 2 turns, for 10 energy
    * */

    Cobalt : {
        image: "cobalt", //path to an image using availableAssets
        name : "Cobalt",
        health: 60,
        defense : 40,
        attack : 6,
        energy: 25, //some actions use energy because they are stronger / enhanced
        speed : 94,//TEMPORARY 99, HIS REGULAR SPEED IS 14
        actions : ["slash","shatter","rectal exam 9000"], //ONLY damage or debuffing moves
    },

    /*
    * Actions:
    *   Base move:
    *   Wack: deal 1x ATTACK to 1 enemy for 1 energy
    *
    *   extras:
    *   Fireball: deal 2x ATTACK to 1 enemy and apply FIRE debuff for 15 energy
    *   DragonFlame: Deal 1x ATTACK to 3 enemies for 20 energy
    *   Stagger: Randomly increase the potency of 1 debuff on an enemy by 1 stack for 10 energy
    *
    * */

    Illumine : {//MAIN DAMAGE DEALER
        image:"illumine",
        name : "Illumine",
        health : 35,
        defense : 0,
        attack :7,
        energy : 35,
        speed : 18,
        actions : ["wack","fireball","bigfart2"],
    },


    /*
    * Spells:
    *   base move:
    *   Splash: WET an enemy , increasing the guard window for their next attack (easier dodges) for 5 energy
    *
    *   extras:
    *   Empower: Increase an ally's attack by 1 for their next attack, for 10 energy
    *   SweetLullaby: 30% base chance to cause an enemy to SLEEP, otherwise apply FATIGUE for 15 energy
    *   MoonlightIllusion: create a dummy that enemies can target, that dummy has higher target priority.
    *
    * */
    Flurrine : {//DEBUFFER / BUFFER
        name : "Flurrine",
        health : 50,
        defense : 2,
        attack : 2,
        energy :50,
        speed : 16,
        actions : ["splash"],
    },
    //


    /*
    * spells:
    *   base move:
    *   Shotgun: Deal damage to an enemy up close in a burst of 3 shots, dealing his 1x ATTACK each, you can intentionally hit the yellow zones to deal damage to adjacent targets
    *
    * */
    Spear : {//SUPPORT DEBUFF / AIR DAMAGE DEALER
        name : " Spear",
        health : 45,
        defense : 3,
        attack: 3,
        energy : 35,
        speed : 20,
        actions : ["shotgun"],
    },


}



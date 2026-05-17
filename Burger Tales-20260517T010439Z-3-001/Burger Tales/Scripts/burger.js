var startTime = getTime();
//game is a paper-mario-styled rpg, with pngs
//Thank you OOBDOOB Green for the tweenservice module!

//I plan on doing optimization maybe but I haven't gotten to that yet. the code so far is very messy

var playerData = { //most values will be encoded here, refer to the DGV for readable data
    "id" : 0,
    "internalData" : "",
    "saveData" : "", //hold all the data in a megastring to be spliced
    "UsernamePassword" : "placeholder",//username and password are both chunked together
    "Currency" : null, //will be stored as an encoded string, currency types
    "Xp" : 0, //flat value stored here, will convert into levels using math
    "EnchantData" : ""//stored here as a string
};

//DECODED GAME VARIABLES (DGV)
var currency = {};

var Inventory = [];//store all items here as strings

var internalData = []; //splice the string into this!

//decode what the player has into playermoves
var leftoverXp = 0;
var level = 25; //25 is the max level
var location = ""; //used for story save data

//quick note; "self" doesn't seem to exist in these values here but it gets implemented when being converted into battlefield vars
var playerSlot = null; //stuff like A1 or A2, used as "self" for when we need to call upon items and stuff

var instance = {
    newLabel : function(name,x,y,w,h,color,text,txtColor) {
        textLabel(name,text);
        setPosition(name,x,y,w,h);
        setProperty(name,"background-color",color || "White");
        setProperty(name,"text-color",txtColor || "White");
    },
    newButton : function(name,x,y,w,h,color,text,txtColor){
        button(name,text);
        setPosition(name,x,y,w,h);
        setProperty(name,"background-color",color || "White");
        setProperty(name,"text-color",txtColor || "White");
    },
    newImage : function(name,x,y,width,height,imageURL){
        image(name,imageURL || "nil.png");
        setPosition(name,x,y,width,height);
        setStyle(name, "user-drag: none; user-select: none; -webkit-user-drag: none;");
    },
};

var player = {
    Name : "PLAYER",
    "hp" : 10+Math.round(Math.pow(level,1.399)),
    "atk" : Math.round(Math.pow(level,0.7)),
    "crg" : 10,
    "def" : 0,
    messages : ["hi"],
    "actions" : {},
    logic : function(side, code){ //the values here are THE PLAYER (We can use this to reference itself)
        playerSlot = code;
        if (battlefield.allies[playerSlot].hp.cur <=0) {cycle();//skip the player in case they get accidently given a turn
            return}
        showElement("Action");
        showElement("Item");
        showElement("Pass");
    }
};

function updatePlayerLevels(){
    var nextLvlXp = 0;
    for (var lv = 1; lv<=25;lv++){
        if (playerData.Xp <Math.floor((10*Math.pow(lv+1,1.5)))){
            level = lv;
            leftoverXp = playerData.Xp - Math.floor((10*Math.pow(lv-1,1.5)));
            nextLvlXp = (Math.floor(10*Math.pow(lv+1,1.5)))- playerData.Xp;
            break;
        } else {
            level = 25;
            leftoverXp = playerData.Xp-1250;
        }
    }
    player.hp = 10+Math.round(Math.pow(level,1.399));
    player.atk = Math.round(Math.pow(level,0.7));
    setText("levelLabel","level "+level+" | "+playerData.Xp+ " total xp | "+nextLvlXp+" xp left to lvl "+(level+1));
}

var chapter = 0;
var section = "";//subsection of a chapter, basically a new interaction
var SPart = 0; //scene of a section
var curSong = null;

//field
var battlefield = { //where battles are handled and managed
    "allies" : {
        A1 : null,
        A2 : null,
    },
    "enemies" : {
        E1 : null,
        E2 : null,
        E3 : null
    },
    //the variables below help the algorithms figure out who is alive and who to hit
    activeAllies : [], //these aren't used by the player but are used by the ally and enemies
    activeEnemies : [], //used by the ally to not accidently hit a dead enemy and for AoE attacks
};

var activeDamageTimers = {};

function labelCreator(side, entityIndex,amount,heal) {
    if (side == "allies") {
        if (activeDamageTimers["Hurt_A"+entityIndex]) { //if we can find the damage timer, we know it still exists
            if (amount <= 0) {setText("Hurt_A"+entityIndex,0)} else {setText("Hurt_A"+entityIndex ,amount + parseInt(getText("Hurt_A"+entityIndex)))}
            setPosition("Hurt_A"+entityIndex,
                getProperty("Ally"+entityIndex,"x")+(getProperty("Ally"+entityIndex,"width")/2),
                getProperty("Ally"+entityIndex,"y")+(getProperty("Ally"+entityIndex,"height")/2),
                getProperty("Ally"+entityIndex,"width"),
                getProperty("Ally"+entityIndex,"height")
            );
            playSound(heal && "OO_heal.mp3" || "OO_Hurt.mp3");
            setProperty("Hurt_A"+entityIndex,"text-color",amount <=0 && rgb(60,251,247) || heal && rgb(0,225,0) || rgb(225,0,0));
            activeDamageTimers["Hurt_A"+entityIndex] = 2000; //reset the timer back to 2000 ms
        } else {
            textLabel("Hurt_A"+entityIndex ,amount);
            setPosition("Hurt_A"+entityIndex,
                getProperty("Ally"+entityIndex,"x")+(getProperty("Ally"+entityIndex,"width")/2),
                getProperty("Ally"+entityIndex,"y")+(getProperty("Ally"+entityIndex,"height")/2),
                getProperty("Ally"+entityIndex,"width"),
                getProperty("Ally"+entityIndex,"height")
            );
            setProperty("Hurt_A"+entityIndex,"text-color",amount <=0 && rgb(60,251,247) || heal && rgb(0,225,0) || rgb(225,0,0));
            setProperty("Hurt_A"+entityIndex,"font-family","Arial Black");
            playSound(heal && "OO_heal.mp3" || "OO_Hurt.mp3");
            activeDamageTimers["Hurt_A"+entityIndex] = 2000;
            function runTimerA(name,time){
                activeDamageTimers[name] -= 50;
                setTimeout(function(){
                    var colorArr = stripRGBValues(getProperty(name,"text-color"));
                    if (activeDamageTimers[name]<=1000) {setProperty(name,"text-color",rgb(colorArr.red,colorArr.green,colorArr.blue,activeDamageTimers[name]/1000))} else {setProperty(name,"text-color",rgb(colorArr.red,colorArr.green,colorArr.blue,1))}
                    if (activeDamageTimers[name] <= 0){
                        deleteElement(name);
                        return;
                    }
                    runTimerA(name,activeDamageTimers[name]);
                },50);
            }
            runTimerA("Hurt_A"+entityIndex,2000);
            bounce("Hurt_A"+entityIndex,"y");
        }
    } else {//ENEMY TIMER //////////////////////////////////////////////
        if (activeDamageTimers["Hurt_E"+entityIndex]) {
            if (amount <= 0) {setText("Hurt_E"+entityIndex,0)} else {setText("Hurt_E"+entityIndex ,amount + parseInt(getText("Hurt_E"+entityIndex)))}
            setPosition("Hurt_E"+entityIndex,
                getProperty("Enemy"+entityIndex,"x")+(getProperty("Enemy"+entityIndex,"width")/2),
                getProperty("Enemy"+entityIndex,"y")+(getProperty("Enemy"+entityIndex,"height")/2),
                getProperty("Enemy"+entityIndex,"width"),
                getProperty("Enemy"+entityIndex,"height")
            );
            setProperty("Hurt_E"+entityIndex,"text-color",amount < 1 && rgb(60,251,247) || heal && rgb(0,225,0) || rgb(225,0,0));
            activeDamageTimers["Hurt_E"+entityIndex] = 2000;
        } else {
            textLabel("Hurt_E"+entityIndex ,amount);

            setPosition("Hurt_E"+entityIndex,
                getProperty("Enemy"+entityIndex,"x")+(getProperty("Enemy"+entityIndex,"width")/2),
                getProperty("Enemy"+entityIndex,"y")+(getProperty("Enemy"+entityIndex,"height")/2),
                getProperty("Enemy"+entityIndex,"width"),
                getProperty("Enemy"+entityIndex,"height")
            );
            setProperty("Hurt_E"+entityIndex,"text-color",amount < 1 && rgb(60,251,247) || heal && rgb(0,225,0) || rgb(225,0,0));
            setProperty("Hurt_E"+entityIndex,"font-family","Arial Black");
            activeDamageTimers["Hurt_E"+entityIndex] = 2000;
            function runTimer(name){
                activeDamageTimers[name] -= 50;
                setTimeout(function(){
                    var colorArr = stripRGBValues(getProperty(name,"text-color"));
                    if (activeDamageTimers[name]<=1000 && activeDamageTimers[name]>0) {setProperty(name,"text-color",rgb(colorArr.red,colorArr.green,colorArr.blue,activeDamageTimers[name]/1000))}
                    if (activeDamageTimers[name] <= 0){
                        deleteElement(name);
                        return;
                    }
                    runTimer(name,activeDamageTimers[name]);
                },50);
            }
            runTimer("Hurt_E"+entityIndex);
            bounce("Hurt_E"+entityIndex,"y");
        }
    }
}

function stripRGBValues(rgbValue){//make rgb() easier to manage into an array of colors
    if (rgbValue.substring(0,4) === "rgb("){
        rgbValue = rgbValue.substring(4,rgbValue.length-1).split(",");
    } else if (rgbValue.substring(0,4)==="rgba") {
        rgbValue = rgbValue.substring(5,rgbValue.length-1).split(",");
    } else {throw new Error("We did not recieve an rgb value! \n"+rgbValue)}
    return {red: Number(rgbValue[0]),green:Number(rgbValue[1]),blue:Number(rgbValue[2])};
}

var index = 0;
var cacheEffects = [];

function statusEffectIcon(side,target,effect,typeE){
    //THIS ONLY HANDLES IMAGE CREATION; WE DO NOT DEAL WITH DELETION HERE
    switch (side){
        case "allies":
            var numOfEffects = Object.keys(battlefield[side][target].debuffs).length + Object.keys(battlefield[side][target].buffs).length;
            var tx = getProperty("Ally"+target.substring(target.length-1,target.length),"x");
            var ty = getProperty("Ally"+target.substring(target.length-1,target.length),"y");
            instance.newImage(effect+battlefield[side][target][typeE][effect].index,(tx-10)+ ((numOfEffects-1)*20),ty-10,20,20,effect+"-icon.png");
            instance.newLabel(effect+battlefield[side][target][typeE][effect].index+"_dur",(tx)+ ((numOfEffects-1)*20),ty-20,15,15,rgb(0,0,0,0.5),battlefield[side][target][typeE][effect].dur,rgb(255,255,255));
            instance.newLabel(effect+battlefield[side][target][typeE][effect].index+"_stack",(tx-15)+ ((numOfEffects-1)*20),ty-5,12,12,rgb(0,0,0,0.5),battlefield[side][target][typeE][effect].stack,rgb(255,255,0));
            break;
        default:
            var numOfEffectsE = Object.keys(battlefield[side][target].debuffs).length + Object.keys(battlefield[side][target].buffs).length ;
            var txe = getProperty("Enemy"+target.substring(target.length-1,target.length),"x");
            var tye = getProperty("Enemy"+target.substring(target.length-1,target.length),"y");
            instance.newImage(effect+battlefield[side][target][typeE][effect].index,(txe-10)+(20*(numOfEffectsE-1)),tye-10,20,20,effect+"-icon.png");
            instance.newLabel(effect+battlefield[side][target][typeE][effect].index+"_dur",(txe)+ ((numOfEffectsE-1)*20),tye-20,15,15,rgb(0,0,0,0.5),battlefield[side][target][typeE][effect].dur,rgb(255,255,255));
            instance.newLabel(effect+battlefield[side][target][typeE][effect].index+"_stack",(txe-15)+ ((numOfEffectsE-1)*20),tye-5,12,12,rgb(0,0,0,0.5),battlefield[side][target][typeE][effect].stack,rgb(255,255,0));
            break;
    }
    cacheEffects.push(effect+battlefield[side][target][typeE][effect].index);
    cacheEffects.push(effect+battlefield[side][target][typeE][effect].index+"_dur");
    cacheEffects.push(effect+battlefield[side][target][typeE][effect].index+"_stack");
}

var utility = {
    //hp functions are seperate because they need to show damage taken, and is often used
    heal : function(target, amount,side){
        labelCreator(side,target.substring(1,2),amount,true);
        if (battlefield[side][target].hp.cur + amount > battlefield[side][target].hp.max) {
            battlefield[side][target].hp.cur = battlefield[side][target].hp.max;
        } else {
            battlefield[side][target].hp.cur += amount;
        }
    },
    damage : function(target, amount, side,debuff){ //offload the damage instancing creator here for 100% acc
        if (!battlefield[side][target]) {return}
        try {//there are small chances that the recieved target is null because of improper entity removal from the battlefield; it is VERY rare though and it causes a fatal error
            if (!debuff) {amount-=battlefield[side][target].def.cur}
            if (amount<1) {
                playSound("sound://category_collect/retro_game_powerup_6.mp3");
                labelCreator(side,target.substring(1,2),amount);
                return;
            }
            shake((capFirstLetter(side)).substring(0,side.length-3)+"y"+target.substring(1,2), 10, 1000,true);
            labelCreator(side,target.substring(1,2),amount);
            if (battlefield[side][target].hp.cur - amount <= 0) {battlefield[side][target].hp.cur = 0} else {battlefield[side][target].hp.cur -= amount}
        } catch(error){
            console.log(error + " encountered!");
            console.log("we recieved "+target+" from "+ side +" but something went wrong");
            setText("BattleBox","Something went wrong, but the game can still run [Address; UTILITY.DAMAGE()]");
        }
    },

    //DO NOT USE THESE FOR HP CHANGES, they don't need visuals here;
    take : function(target, amount, side, stat) {
        if (battlefield[side][target][stat].cur - amount < 0) {
            battlefield[side][target][stat].cur = 0;
        } else {
            battlefield[side][target][stat].cur -= amount;
        }
    },
    grant : function(target, amount, side, stat){
        if (battlefield[side][target][stat].cur + amount > battlefield[side][target][stat].max ) { //do not allow overcapping
            battlefield[side][target][stat].cur = battlefield[side][target][stat].max;
        } else {
            battlefield[side][target][stat].cur += amount;
        }
    },
    effect : function(target,effect,side,effectType,stackAmount){//after the debuff gets its duration to 0, it is not properly disposed of
        if (battlefield[side][target][effectType][effect]) { //if it alr exists, add a stack
            if (battlefield[side][target][effectType][effect].stack + 1 > battlefield[side][target][effectType][effect].max) {return}
            battlefield[side][target][effectType][effect].stack += stackAmount || 1;
            setText(effect+battlefield[side][target][effectType][effect].stack+"_dur",battlefield[side][target][effectType][effect].stack);
        } else { //if not, add a new instance
            battlefield[side][target][effectType][effect] = {};//so new debuffs override the old one...
            battlefield[side][target][effectType][effect].index = index;//we use this to keep track of image creation and deletion
            index++;//increase the index for later duplicates/other people
            battlefield[side][target][effectType][effect].name = effects[effectType][effect].name;
            battlefield[side][target][effectType][effect].stack = stackAmount || 1;
            battlefield[side][target][effectType][effect].dur = effects[effectType][effect].dur;
            battlefield[side][target][effectType][effect].stat = effects[effectType][effect].stat;
            battlefield[side][target][effectType][effect].amp = effects[effectType][effect].amp;
            battlefield[side][target][effectType][effect].max = effects[effectType][effect].max;
            statusEffectIcon(side,target,effects[effectType][effect].name,effectType);//which causes this to retrigger
        }
    }, //apply status effects here

    cleanse : function(target,side,effectType,effect) {//this is not functional yet
        try {//effect is used for specific cleanses (e.g. if an item or spell specifically cures poison or fire)
            if (effect) {//then we know we have a "specific" cleanse
                delete battlefield[side][target][effectType][effect];
            } else {//then we know we have a general cleanse that'll clear a random effect from said type
                var Keys = Object.keys(battlefield[side][target][effectType]);
                var randomPick = battlefield[side][target][effectType][Keys[randomNumber(0,Keys.length-1)]];

                delete battlefield[side][target][effectType][effect][randomPick];
            }

        } catch(error) {
            setText("BattleBox","Cleanse failed! Or the effect doesn't exist");
        }
    },//remove debuffs for cleansing
};


var characters = { //allies
    "MG_Tut" : { //temporary name
        hp : 55,
        atk : 5,
        def : 1,
        Name: "Magnesium",
        messages: ["GET THEM "+player.Name+"!", "Who are you",'Oops'],
        action : {//because of callstack sizes, each action seems to be limited to only 2
            thunderclap : function(side,code,self){ //slam
                showElement("Button");
                setText("BattleBox","Magnesium calls in thunder!")
                playSound("sound://category_explosion/radioactive_zombie_explode_2.mp3");
                utility.effect(code,"Burn",side,"debuffs");
                utility.damage(code,battlefield.allies[self].atk.cur,side);
                return;
            },
            spell : function(side,code,self){ //slam
                showElement("Button");
                setText("BattleBox","Magnesium casts in a dark spell!");
                playSound("sound://category_achievements/puzzle_game_secret_unlock_01.mp3");
                utility.damage(code,battlefield.allies[self].atk.cur-2,side);
                return;
            },
        },
        logic : function(side, code) {
            var keys = [];
            var Tenemy = battlefield.activeEnemies[randomNumber(0,battlefield.activeEnemies.length-1)];
            for (var x in battlefield[side][code].action) {if (typeof battlefield[side][code].action[x] == "function") {keys.push(x)}}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]]("enemies",Tenemy,code);
            // battlefield[side][code].action.thunderclap("enemies",Tenemy,code);
        }
    },
    "Witch" :  {//dot and vulnerability specialist
        hp : 25,
        atk : 2,
        def : 0,
        Name: "Witch",
        messages: ["Im bewitched you'd ever say that", "I can give you a funny elixir"],
        action : {//they do nothing as of right now
            slash : function(side,code,thisSide,self){ //TEMP EMPTY; deals 4 dmg, inflicts 1 stack of poison
                showElement("Button");
                return;
            },
            tag_team : function(side,code,thisSide,self){ //TEMP EMPTY: deals 2 dmg but applies 2 stacks of poison
                showElement("Button");
                return;
            },
        },
        logic : function(side, code) { //instead of randomly attacking, they will use an attack pattern; NOT INPLEMENTED YET
            var keys = []; //This character does nothing but this serves as the framework
            for (var x in battlefield[side][code].action) {keys.push(x)}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]]();
        }
    },
};

var enemies = {//following OOP structure here
    "Spiker1" : {
        image: "man.png",
        hp : 6,
        atk: 2,
        def : 0,
        name: "Spiker",
        messages: ["You there!", "*slow clap*","*Audience cheering*"],
        xp: 2,
        rewards : {Gold: 4},//we can add an ITEM key for giving away items :>
        action : {
            clap : function(target,side,self){ //slam
                playSound("readyToDodge.mp3");
                setText("BattleBox","Spiker is getting ready to rush you!");
                var ogPos = [ getProperty(self,"x") , getProperty(self,"y") ];
                globalTarget = target;
                globalSide = side;
                startDodge( [ {time : 2000, dmg: 6}, {time : 1500, dmg : 8, dodgeArray : {"Perfect" : 300, "Great" : 600, "Okay" : 900}} ] );
                var r1 = new TweenService.create( self, {x:120,y : getProperty("Ally"+target.substring(target.length-1,target.length),"y")},1,'Sine',"Out",60);
                r1.play();
                setTimeout(function(){//strike
                    playSound("sound://category_music/vibrant_fanfare_harp_sweep_positive.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.85,'Sine',"In",60);
                    r1.play();
                },1100);
                setTimeout(function(){//recoil
                    playSound("sound://category_hits/retro_game_weapon_-_sword_on_shield_3.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x") + 50},0.75,'Sine',"In",60);
                    r1.play();
                },2000);
                setTimeout(function(){//2nd strike
                    playSound("sound://category_alerts/vibrant_game_shutter_alert_1_short_quick.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.2,'Sine',"In",60);
                    r1.play();
                },2800);
                setTimeout(function(){//recoil
                    playSound("sound://category_explosion/playful_game_explosion_5.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x") + 50},0.5,'Linear',"In",60);
                    r1.play();
                },3000);
                setTimeout(function(){//return
                    var r1 = new TweenService.create( self, {x : ogPos[0], y:ogPos[1]},0.85,'Linear',"In",60);
                    r1.play();
                },3100);
            },
            staredown : function(target, side, self) { //rework this to use the debuff system
                var ogPos = [getProperty(self,"x"),getProperty(self,"y")]; //[x,y]
                setText("BattleBox", "Spiker is deciding to stare... and hit!");
                globalTarget = target; //Use this for the dodges,
                globalSide = side;
                startDodge( [ {time : 2500, dmg: 1}, {time : 2000, dmg : 2} ]);
                var r1 = new TweenService.create( self, {x:120,y : getProperty("Ally"+target.substring(target.length-1,target.length),"y")},1.5,'Sine',"Out",60);
                r1.play();
                setTimeout(function(){ //strike
                    playSound("sound://category_music/vibrant_fanfare_harp_sweep_positive.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.85,'Sine',"In",60);
                    r1.play();
                },1650);
                setTimeout(function(){ //recoil
                    playSound("sound://category_explosion/8bit_explosion.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x") + 50},0.75,'Sine',"In",60);
                    r1.play();
                },2500);
                setTimeout(function(){//2nd strike
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.5,'Sine',"In",60);
                    r1.play();
                },3500);
                setTimeout(function(){//recoil
                    playSound("sound://category_hits/8bit_splat.mp3");
                    var r1 = new TweenService.create( self, {x : getProperty("Ally"+target.substring(target.length-1,target.length),"x") + 50},0.5,'Linear',"In",60);
                    r1.play();
                },4000);
                setTimeout(function(){//return
                    var r1 = new TweenService.create( self, {x : ogPos[0], y:ogPos[1]},0.85,'Linear',"In",60);
                    r1.play();
                },4100);
            }
        },
        logic : function(side, code){ //the enemy recieves itself, DO NOT USE SIDE OR CODE
            if (battlefield.enemies["E" + code.substring(code.length-1,code.length)].hp.cur == 0) {
                showElement("Button");
                setText("BattleBox","Misfire occured; press continue");
                return;
            }
            var randomAlly = "A" + battlefield.activeAllies[randomNumber(0,battlefield.activeAllies.length-1)]; //theres only 2 allies for now
            var keys = [];
            for (var x in battlefield[side][code].action) {keys.push(x)}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]](randomAlly, "allies","Enemy" + code.substring(code.length-1,code.length));
        }
    },

    "Dummy" : {
        image: "angryMan.png",
        hp: 8,
        atk: 1,
        def: 0,
        name: "Dummy",
        messages: ["I'm gonna stand still","i'm not dumb, trust", "uh oh"],
        xp: 9, //xp gained from defeat
        rewards : {Gold: 10}, //I know I should've combined xp into rewards, but maybe I'll do that in a later repo upd
        action : {
            stand : function(target,side,self){
                showElement("Button");
                setText("BattleBox", "The dummy chose to stand still... and burn you");
                utility.effect(target,"Burn",side,"debuffs");
                utility.effect(target,"DefDown",side,"debuffs");
                playSound("sound://category_poof/puzzle_game_click_fire_poof_02.mp3");
                return;
            }
        },
        logic : function(side, code){
            var randomAlly = "A" + battlefield.activeAllies[randomNumber(0,battlefield.activeAllies.length-1)];
            battlefield[side][code].action.stand(randomAlly,"allies","Enemy" + code.substring(code.length-1,code.length));
        }
    },

    "Grass_Dweller" :{
        image : "grass.png",
        hp: 3,
        atk: 1,
        def: 0,
        name: "Grass_man",
        messages : ["Grass noises"],
        xp: 2,
        rewards : {Gold: 2},
        action:{
            slap: function(target,side,self){
                playSound("readyToDodge.mp3");
                showElement("Button");
                setText("BattleBox","Grass man warms up his hands...");
                startDodge([{time: 1500, dmg:3}]);
                var ogPos = [getProperty(self,"x"),getProperty(self,"y")];
                globalTarget = target;
                globalSide = side;
                var r1 = new TweenService.create(self,{x:120,y : getProperty("Ally"+target.substring(target.length-1,target.length),"y")},0.9,'Sine',"In",60);
                r1.play();
                setTimeout(function(){//strike;
                    playSound("sound://category_music/vibrant_fanfare_harp_sweep_positive.mp3");
                    var r2 = new TweenService.create(self,{x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.45,'Sine',"In",60);
                    r2.play();
                },1000);
                setTimeout(function(){//recoil
                    playSound("sound://category_hits/retro_game_simple_impact_2.mp3");
                    var r3 = new TweenService.create(self,{x : getProperty("Ally"+target.substring(target.length-1,target.length),"x") + 50},0.2,'Linear',"In",60);
                    r3.play();
                },1550);
                setTimeout(function(){//return
                    var r3 = new TweenService.create(self,{x : ogPos[0], y:ogPos[1]},0.85,'Linear',"In",60);
                    r3.play();
                },1750);
            }
        },
        logic: function(side,code) {
            var randomAlly = "A" + battlefield.activeAllies[randomNumber(0,battlefield.activeAllies.length-1)];
            var keys = [];
            for (var x in battlefield[side][code].action) {keys.push(x)}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]](randomAlly, "allies","Enemy" + code.substring(code.length-1,code.length));
        }
    },

    "Uranium_232":{
        image:"Uranium232.gif",
        hp: 70,
        atk: 5,
        def: -1,//negative defense means attacks get a bonus +x dmg per hit
        name:"Uranium",
        messages:["Im gonna uranium you","I know ur id is: "+getUserId()],
        xp:120,
        rewards : {Gold: 25},
        action:{
            Atomizer: function(target,side,self){//deal 8 dmg in 1 laser, (0.9 sec reaction)
                globalTarget = target;
                globalSide = side;
                instance.newLabel("AuraThing",getProperty("Ally"+target.substring(1,2),"x")-25,getProperty("Ally"+target.substring(1,2),"y")-25,100,100,rgb(188,107,48,0),"");
                setProperty("AuraThing","border-radius",100);
                var auraAlpha = 0;
                function tick(){
                    if (auraAlpha>=1) {deleteElement("AuraThing");
                        return}
                    auraAlpha+=0.05;
                    setTimeout(function(){
                        setProperty("AuraThing","background-color",rgb(188,107,48,auraAlpha));
                        tick();
                    },20);
                }
                setTimeout(function(){tick()},400);
                startDodge([{time:900,dmg:10}]);
                shake(self,5,500);
                showElement("Button");
            },
        },
        logic:function(side,code){
            var randomAlly = "A" + battlefield.activeAllies[randomNumber(0,battlefield.activeAllies.length-1)]; //theres only 2 allies for now
            var keys = [];
            for (var x in battlefield[side][code].action) {keys.push(x)}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]](randomAlly, "allies","Enemy" + code.substring(code.length-1,code.length));
        }
    },
    "Tungsten_cube" : {
        image: "tungsten.png",
        hp: 110,
        atk: 6,
        def:1,
        name: "Tungsten Cube",
        messages: ["..."],
        xp: 100,
        rewards : {Gold: 20},
        action: {
            roll : function(target,side,self){
                playSound("readyToDodge.mp3");
                var ogPos = [getProperty(self,"x"),getProperty(self,"y")];
                globalTarget = target;
                globalSide = side;
                startDodge([{time: 550,dmg: 20,dodgeArray : {"Perfect" : 100, "Great" : 200, "Okay" : 400}}]);
                setText("BattleBox","The giant tungsten cube rolls towards the left!");
                var tween1 = new TweenService.create(self,{x:120,y : getProperty("Ally"+target.substring(target.length-1,target.length),"y")},0.15,'Sine',"In",60);
                tween1.play();//move toward the center
                setTimeout(function(){
                    playSound("sound://category_hits/puzzle_game_organic_metal_tile_hit_2.mp3");
                    var tween2 = new TweenService.create(self,{x : getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.2,'Linear',"In",60);
                    tween2.play();
                },350);
                setTimeout(function(){
                    playSound("sound://category_hits/puzzle_game_magic_item_unlock_5.mp3");
                    var tween3 = new TweenService.create(self,{x : ogPos[0], y:ogPos[1]},0.65,'Linear',"Out",60);
                    tween3.play();
                },550);
            },
            jump : function (target,side,self){
                playSound("readyToDodge.mp3");
                var ogPos = [getProperty(self,"x"),getProperty(self,"y")];
                globalTarget = target;
                globalSide = side;
                setText("BattleBox","The tungsten cube looks ready for a double hit! It leaps into the air...");
                playSound("sound://category_poof/puzzle_game_poof_01.mp3")
                instance.newLabel("Battle_Shadow",getProperty("Ally"+target.substring(target.length-1,target.length),"x"),getProperty("Ally"+target.substring(target.length-1,target.length),"y"),50,50,rgb(0,0,0,0),"");
                startDodge([{time: 1075,dmg: 14},{time:525,dmg:10}]);
                var tween1 = new TweenService.create(self, {y:-150},0.4,"Linear","In",60);
                tween1.play();
                var alphaShadow = 0;
                function tick(){
                    if (alphaShadow >= 0.85) {return}
                    alphaShadow += 0.05;
                    setTimeout(function(){
                        setProperty("Battle_Shadow","background-color",rgb(0,0,0,alphaShadow));
                        tick();
                    }, 45);
                }
                tick();
                setTimeout(function(){
                    playSound("sound://category_explosion/puzzle_game_break_magic_01.mp3");
                    setProperty(self,"x",getProperty("Ally"+target.substring(target.length-1,target.length),"x"));
                    var tween2 = new TweenService.create(self, {y:getProperty("Ally"+target.substring(target.length-1,target.length),"y")},0.2,"Sine","In",60);
                    tween2.play();
                }, 800);
                setTimeout(function(){
                    deleteElement("Battle_Shadow");
                    var tween3 = new TweenService.create(self, {x:getProperty("Ally"+target.substring(target.length-1,target.length),"x")+120},0.2,"Sine","In",60);
                    tween3.play();
                }, 1000);
                setTimeout(function(){//2nd Hit
                    playSound("sound://category_explosion/playful_game_explosion_5.mp3");
                    var tween4 = new TweenService.create(self, {x:getProperty("Ally"+target.substring(target.length-1,target.length),"x")},0.3,"Sine","In",60);
                    tween4.play();
                }, 1200);
                setTimeout(function(){
                    var tween5 = new TweenService.create(self, {x:ogPos[0]},0.6,"Sine","In",60);
                    tween5.play();
                }, 1510);
            }
        },
        logic: function(side,code){
            var randomAlly = "A" + battlefield.activeAllies[randomNumber(0,battlefield.activeAllies.length-1)]; //theres only 2 allies for now
            var keys = [];
            for (var x in battlefield[side][code].action) {keys.push(x)}
            battlefield[side][code].action[keys[randomNumber(0,keys.length-1)]](randomAlly, "allies","Enemy" + code.substring(code.length-1,code.length));
        }
    },
}

/*
effects are complicated i think

stack and amp are the same BUT differ when seperate magntidues (not 1) are in place
> these criteras can be unique stats or mechanics being affected
> stacks usually affect the duration and amplitude

this system does use VERY specific references, so specifically it'll check for x buff/debuff n stuff
*/

var effects = {
    buffs : { //REQ {name,stack,dur,stat,amp}     OPTIONAL: {max (cap on stacks),misc :seperate function for stacking}
        Charge: {name:"Charge",stack:1, dur:2,stat: "atk",amp: 1},
        DefUp: {name:"DefUp",stack:1, dur: 2,stat: "def",amp: 1},
        CrgDown: {name:"CrgDown",stack:1, dur: 1,stat: "crg",amp: -1, max: 1},
        Ghostly: {name: "Ghostly", stack: 0,dur:2, stat: "nil", amp: Infinity,max:0},
        SlowHeal: {name:"SlowHeal",stack:1, dur: 3,stat: "hp",amp: 5, max: 3},
    },
    debuffs : {
        Vulnerable : {name:"Vulnerable",stack:1, dur: 2,stat: "DHC",amp: 0.4, max: 2}, //affects the DoT hit chance
        Burn: {name:"Burn",stack:1, dur: 3,stat: "hp",amp: -1, max:5},
        Poison: {name:"Poison",stack:1, dur: 5,stat: "hp",amp: -1, max: 6, misc: function(statEffect){if (statEffect === 6){return "dmg-"+statEffect.stack*4+"~remove"}}},
        AtkDown: {name:"AtkDown",stack:1, dur: 2,stat: "atk",amp: -1},
        DefDown: {name:"DefDown",stack:1, dur:  2,stat: "def",amp: -1},
        Stun : {name:"Stun",stack:1, dur: 1,stat: "turn",amp: 1, max: 1},
        Confusion : {name: "Confusion", stack:0, dur:1, stat: "target", amp: Infinity, max:0},
        // Electricity: {name: "Shock", stack:1, dur:2, stat:"hp", amp:-1, max:3, misc: function(side){},} //aoe dmg
    },
}

var items = {
    coconut : {name: "coconut", snd: "Coconut.mp3", image: "Coconut.png", action: "heal", heal: 13, desc: "There's always time for a cocounut!\n heals for 13 hp",price:10},
    sugar_apple: {name: "sugar_apple", snd:"Sugar_Apple.mp3", image: "sugar_apple.png", action: "heal", heal: 28, desc:"A sweet treat to boost morale\n heals for 28 hp",price:35},
    orange: {name : "orange", snd :"Orange.mp3", image: "orange.png", action: "heal",heal : 5, desc: "an orange a day keeps the doctor away!\n heals for 5 hp",price:8},
    papaya: {name : "papaya", image: "papaya.png", action: "heal",heal : 5, desc: "I know you love papayas, deep in your heart you do\n heals for 5 hp",price:8},
    rock: {name : "rock", snd :"why.mp3", image: "rock.png", action: "heal",heal : 55, desc: "a rock...? What type of rock did you pick up bro\n heals for 55 hp",price:70},
    mango: {name : "mango", snd :"mango.mp3", image: "mango.png", action: "heal",heal : 10, desc: "This isnt ripe\n heals for 10 hp",price:12},
    nutella: {name : "nutella", snd :"nutella.mp3", image: "nutella.png", action: "heal",heal : 99, desc: "N U T E L L A\n heals for 99 hp",price:140},
    fish: {name : "fish", snd :"fish.mp3", image: "fish.png", action: "heal",heal : 5, desc: "its just a raw fish\n heals for 5 hp",price:8},
    pomengranate : {name:"pomengranate",snd:"pomen.mp3",image:"pomengranate.png",action:"heal",heal:35,desc:"NO MORE POMENGRANATES! \n heals for 35 hp"},
    funyuns : {name:"funyuns", snd:"funyun.mp3",image:"funyuns.png",action:"heal",heal:25,desc: "A yun that is fun \n heals for 25 hp", price: 15},
    banana : {name:"banana", snd:"banana.mp3",image:"banana.png", action:"heal",heal:10,desc:"A soft peely yellow fruit \n heals for 10 hp"},
    caesar_salad : {name:"caesar_salad",snd:"salad.mp3",image:"caesar_salad.png",action:"heal",heal:15,desc:"ewww salad...\n heals for 15 hp"},
    nuke : {name:"nuke",snd:"nuke.mp3",image:"nuke.png",action:"damage",damage:100,desc:"nuke \n deals 100 dmg to selected target"},
};

var moves = {
    "sword-m1" : function(target, side,crgAsk) {
        if (crgAsk) {return 0}
        setText("BattleBox","Click when the cursor is in the green region!");
        instance.newLabel("swordbg",100,285,120,20,rgb(50, 51, 52),"");
        var Range = randomNumber(100,180);
        var swordX = 105;
        var shouldDecrease = false;
        instance.newLabel("swordArea",Range,285,40,20,rgb(167, 223, 112),"");
        instance.newLabel("swordTick",105,295,10,20,rgb(255, 156, 156),"");
        function TICK(){
            if (shouldDecrease == null) {return}
            if (swordX >= 215) {shouldDecrease = true} else if(swordX <= 95) {shouldDecrease = false}//moderates the direction of the scrolling
            swordX = shouldDecrease == false && swordX + 5 || swordX -5;
            setTimeout(function(){
                setPosition("swordTick",swordX,295,10,20);
                TICK();
            },25);
        }
        TICK();
        instance.newButton("Hit",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#4b7bac',"Attack");
        onEvent("Hit","click",function(){
            deleteElement("swordbg");
            deleteElement("swordTick");
            deleteElement("swordArea");
            shouldDecrease = null;
            deleteElement("Hit");
            showElement("Button");
            playSound("sound://category_swing/swing_1.mp3");
            if (swordX <= (Range+40) && swordX >= (Range-20)){//confirm hit with added generosity
                utility.damage(target, player.atk + 1, side);
            } else {
                utility.damage(target, 1, side);
            }
        });
    },
    "sword-m2": function(target,side,crgAsk){
        if (crgAsk){return 3}
        utility.take(playerSlot,3,"allies","crg");
        setText("BattleBox","Click when the cursor is in the green region!");
        instance.newLabel("swordbg",100,285,120,20,rgb(50, 51, 52),"");
        var Range = randomNumber(100,180);
        var swordX = 105;
        var shouldDecrease = false;
        instance.newLabel("swordArea",Range,285,40,20,rgb(167, 223, 112),"");
        instance.newLabel("swordTick",105,295,10,20,rgb(255, 156, 156),"");
        function TICK(){
            if (shouldDecrease == null) {return}
            if (swordX >= 215) {shouldDecrease = true} else if(swordX <= 95) {shouldDecrease = false}
            swordX = shouldDecrease == false && swordX + 5 || swordX -5;
            setTimeout(function(){
                setPosition("swordTick",swordX,295,10,20);
                TICK();
            },25);
        }
        TICK();
        instance.newButton("Hit",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#4b7bac',"Attack");
        onEvent("Hit","click",function(){
            deleteElement("swordbg");
            deleteElement("swordTick");
            deleteElement("swordArea");
            shouldDecrease = null;
            deleteElement("Hit");
            showElement("Button");
            playSound("sound://category_swing/swing_1.mp3");
            if (swordX <= (Range+40) && swordX >= (Range-20)){
                utility.damage(target, player.atk+3, side);
            } else {
                utility.damage(target, player.atk, side);
            }
        });
    },
    "staff-m1" : function(target,side,crgAsk) { //use the same system as reg enemies, wait for proj to hit target
        if (crgAsk) {return 0}
        setText("BattleBox","Hold the 'hold' button to try and keep the bar within the green range! Do not let it hit the sides of the bar! After 5 seconds, you will start to lose control!");
        instance.newLabel("StaffBarBG",80,210,165,30,rgb(101,0,115,0.73),"");
        var zoneAreaX = 90+(randomNumber(0,95));
        instance.newLabel("zone",zoneAreaX,210,50,30,rgb(25,165,73),"");
        instance.newLabel("TickStaff",80,210,10,30,rgb(0,0,0),"");
        instance.newButton("Attack",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#9c3add',"Hold");
        var holding = false;
        var points = 0;
        var currentX = 10;
        var started = false;
        var startTime = getTime();
        onEvent("Attack","mousedown",function(){
            if (!started) {
                started = true;
                setTimeout(function(){stabilityMult = 2.5},5000);
            }
            holding = true;
            setProperty("Attack","background-color","green");
        });
        onEvent("Attack","mouseup",function(){
            holding = false;
            setProperty("Attack","background-color","red");
        });
        var stabilityMult = 1;
        function tick(){
            if (started && currentX <= 0 || started && currentX >= 165) {
                deleteElement("zone");
                deleteElement("TickStaff");
                deleteElement("Attack");
                deleteElement("StaffBarBG");
                utility.damage(target, 1 , side);
                playSound("sound://category_alerts/cartoon_negative_bling.mp3");
                showElement("Button");
                return} else if (!started) {currentX = 10}
            if (points >= 75) {
                deleteElement("zone");
                playSound("sound://category_hits/vibrant_game_dirty_desolve_2.mp3");
                deleteElement("TickStaff");
                deleteElement("Attack");
                deleteElement("StaffBarBG");
                utility.damage(target, player.atk , side);
                utility.effect(target,"Burn",side,"debuffs");
                showElement("Button");
                return}
            if (holding){currentX+=14*stabilityMult}
            if (currentX>0){currentX-= 6 *(stabilityMult)}

            if (currentX+80 > zoneAreaX && currentX+80 < zoneAreaX +50) {points++}
            setProperty("TickStaff","x",currentX+80);
            setTimeout(function(){tick()},25);
        }
        tick();
    },
    "staff-m2" : function(target,side,crgAsk) { //For right now, this is just a copy!!!
        if (crgAsk) {return 3}
        utility.take(playerSlot,3,"allies","crg");
        setText("BattleBox","Hold the 'hold' button to try and keep the bar within the green range! Do not let it hit the sides of the bar! After 4 seconds, you will start to lose control!");
        instance.newLabel("StaffBarBG",80,210,165,30,rgb(101,0,115,0.73),"");
        var zoneAreaX = 90+(randomNumber(0,95));
        instance.newLabel("zone",zoneAreaX,210,50,30,rgb(25,165,73),"");
        instance.newLabel("TickStaff",80,210,10,30,rgb(0,0,0),"");
        instance.newButton("Attack",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#9c3add',"Hold");
        var holding = false;
        var points = 0;
        var currentX = 10;
        var started = false;
        var startTime = getTime();
        onEvent("Attack","mousedown",function(){
            holding = true;
            started = true;
            setProperty("Attack","background-color","green");
        });
        onEvent("Attack","mouseup",function(){
            holding = false;
            setProperty("Attack","background-color","red");
        });
        var stabilityMult = 1;
        setTimeout(function(){console.log("getting unstable"),stabilityMult = 2},4500);
        function tick(){
            if (started && currentX <= 0 || started && currentX > 155) {
                deleteElement("zone");
                deleteElement("TickStaff");
                deleteElement("Attack");
                deleteElement("StaffBarBG");
                utility.damage(target, 3 , side);
                showElement("Button");
                return} else if (!started) {currentX = 10}
            if (points >= 80) {
                deleteElement("zone");
                deleteElement("TickStaff");
                deleteElement("Attack");
                deleteElement("StaffBarBG");
                utility.damage(target, player.atk+2 , side);
                utility.effect(target,"Burn",side,"debuffs");
                showElement("Button");
                return}
            if (holding && currentX + (20 *stabilityMult) < 155){currentX+=20*stabilityMult} else if (holding&&currentX + (20*stabilityMult) > 155){currentX=155}
            if (currentX>0){currentX-= 9 *stabilityMult}

            if (currentX+80 > zoneAreaX && currentX+80 < zoneAreaX +50) {points++}
            setProperty("TickStaff","x",currentX+80);
            setTimeout(function(){tick()},25);
        }
        tick();
    },
    "bow-m1" : function(target,side,crgAsk) {//make them button mash to charge a meter, dealing 7 max (supposing def doesnt get in the way)
        if (crgAsk) {return 0}
        instance.newLabel("bowBg",100,285,120,20,rgb(50, 51, 52),"");
        instance.newLabel("bowBar",100,285,0,20,rgb(84, 206, 214),"");
        setText("BattleBox","Mash the \"mash\" button to capitalize off the bow!");
        var tickOverride = false;
        var meter = 0;
        var dmgReturn = 1;
        instance.newButton("Mash",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#4b7bac',"Mash!");
        function TICK(){
            if (tickOverride) {return}
            setTimeout(function(){
                if (meter>0 && meter < 120){meter-=1} else if (meter >= 120) {return} else if(!getProperty("bowBar","x")){return}
                setPosition("bowBar",100,285,meter,20);
                TICK();
            },30);
        }
        TICK();
        onEvent("Mash","click",function(){
            if (meter>=120) {meter=120;
                return}
            meter+= 15;
            setPosition("bowBar",100,285,meter,20);
        });
        setTimeout(function(){
            tickOverride = true;
            deleteElement("Mash");
            deleteElement("bowBar");
            deleteElement("bowBg");
            var arrowsToShoot = player.atk - 3;
            var totalDmg = 0;
            if (arrowsToShoot<1) {arrowsToShoot=1}
            setTimeout(function(){showElement("Button")},arrowsToShoot*100);
            for (var bowArrows=1;bowArrows<=Math.round(arrowsToShoot*(meter/120));bowArrows++){
                setTimeout(function(){
                    if (battlefield[side][target] && battlefield[side][target].hp.cur <= 0) {return}
                    if (randomNumber(1,2) == 2 &&  totalDmg <=15) {utility.damage(target, 1 , side),totalDmg+= 1 - battlefield[side][target].def.cur} else if (totalDmg <=15){utility.damage(target, 2 , side),totalDmg+=2- battlefield[side][target].def.cur}
                    playSound("sound://category_hits/puzzle_game_button_04.mp3");
                },100*bowArrows);
            }
        },4000);
    },
    "bow-m2" : function(target,side,crgAsk) {//make them button mash to charge a meter, dealing 14 max (supposing def doesnt get in the way)
        if (crgAsk) {return 3}
        utility.take(playerSlot,3,"allies","crg");
        instance.newLabel("bowBg",100,285,120,20,rgb(50, 51, 52),"");
        instance.newLabel("bowBar",100,285,0,20,rgb(84, 206, 214),"");
        setText("BattleBox","Mash the \"mash\" button to capitalize off the bow!");
        var tickOverride = false;
        var meter = 0;
        var dmgReturn = 1;
        instance.newButton("Mash",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#4b7bac',"Mash!");
        function TICK(){
            if (tickOverride) {return}
            setTimeout(function(){
                if (meter>0 && meter < 120){meter-=1} else if (meter >= 120) {return} else if(!getProperty("bowBar","x")){return}
                setPosition("bowBar",100,285,meter,20);
                TICK();
            },30);
        }
        TICK();
        onEvent("Mash","click",function(){
            if (meter>=120) {meter=120;
                return}
            meter+= 15;
            setPosition("bowBar",100,285,meter,20);
        });
        setTimeout(function(){
            tickOverride = true;
            deleteElement("Mash");
            deleteElement("bowBar");
            deleteElement("bowBg");
            showElement("Button");
            utility.damage(target, Math.round((player.atk+4)*(meter/120)) , side);
        },4000);
    },
    "cannon-m1" : function(target,side,crgAsk) {//cranking-like minigame, slides the slider back n forth
        if (crgAsk) {return 0}
        instance.newImage("CannonPlayer",getProperty("Ally"+playerSlot.substring(1),"x")+20,getProperty("Ally"+playerSlot.substring(1),"y")-10,100,100,"cannon.png");
        slider("cannonSlider");
        setText("BattleBox","Move the slider back and forth 5 times to light the cannon!");//give the player directions
        setPosition("cannonSlider",85,285,150,30);//i dont have a custom creator function cuz sliders are rarely even used bruh
        var shouldRev = false;
        var revolutions = 0;//complete 10 revolutions to complete the attack
        onEvent("cannonSlider","input",function(){
            if (revolutions >= 5){//divide by 2 to get the actual amount of complete revolutions
                if (isNaN(getNumber("cannonSlider"))) {return}
                deleteElement("cannonSlider");
                showElement("Button");
                var TARGET = "Enemy"+(target.substring(1,2)).toString(); //use this to find the enemy obj
                instance.newLabel("Cannonball",getProperty("CannonPlayer","y"),getProperty("CannonPlayer","y")+15,20,20,rgb(0,0,0),"");
                setProperty("Cannonball","border-radius",100);
                var newTween = new TweenService.create("Cannonball",{x:280,y:getProperty(TARGET,"y")+5},0.1,'Sine',"In",60);
                newTween.play();
                shake("CannonPlayer",10,1000,true);
                setTimeout(function(){
                    instance.newImage("ExplosionVFX",getProperty(TARGET,"x")-20,getProperty(TARGET,"y")-20,100,100,"low-quality-explosion.gif");
                    setTimeout(function(){deleteElement("ExplosionVFX")},800);
                    playSound("sound://category_alerts/vibrant_game_life_lost_1.mp3");
                    for (var ens=1; ens<=3;ens++) {//attack all enemies
                        if (battlefield[side]["E"+ens] && battlefield[side]["E"+ens].hp.cur > 0){
                            utility.damage("E"+ens, Math.round(player.atk/2) , side,true);
                        }
                    }
                    deleteElement("Cannonball");
                },100);
                setTimeout(function(){deleteElement("CannonPlayer")},1500);
                return;
            }
            if (getNumber("cannonSlider") == 100 && !shouldRev) {//slider reversing conditions
                shouldRev = true;
                revolutions++;
            } else if (getNumber("cannonSlider") == 0 && shouldRev) {
                shouldRev = false;
                revolutions++;
            }
        });
    },
    "cannon-m2" : function(target,side,crgAsk) {//cranking-like minigame, slides the slider back n forth
        if (crgAsk) {return 0}
        instance.newImage("CannonPlayer",getProperty("Ally"+playerSlot.substring(1),"x")+20,getProperty("Ally"+playerSlot.substring(1),"y")-10,100,100,"cannon.png");
        slider("cannonSlider");
        setText("BattleBox","Move the slider back and forth 5 times to light the cannon!");//give the player directions
        setPosition("cannonSlider",85,285,150,30);//i dont have a custom creator function cuz sliders are rarely even used bruh
        var shouldRev = false;
        var revolutions = 0;//complete 10 revolutions to complete the attack
        onEvent("cannonSlider","input",function(){
            if (revolutions >= 5){//divide by 2 to get the actual amount of complete revolutions
                if (isNaN(getNumber("cannonSlider"))) {return}
                deleteElement("cannonSlider");
                showElement("Button");
                var TARGET = "Enemy"+(target.substring(1,2)).toString(); //use this to find the enemy obj
                instance.newLabel("Cannonball",getProperty("CannonPlayer","y"),getProperty("CannonPlayer","y")+15,20,20,rgb(0,0,0),"");
                setProperty("Cannonball","border-radius",100);
                var newTween = new TweenService.create("Cannonball",{x:280,y:getProperty(TARGET,"y")+5},0.1,'Sine',"In",60);
                newTween.play();
                shake("CannonPlayer",10,1000,true);
                setTimeout(function(){
                    instance.newImage("ExplosionVFX",getProperty(TARGET,"x")-20,getProperty(TARGET,"y")-20,100,100,"low-quality-explosion.gif");
                    setTimeout(function(){deleteElement("ExplosionVFX")},800);
                    playSound("sound://category_alerts/vibrant_game_life_lost_1.mp3");
                    for (var ens=1; ens<=3;ens++) {//attack all enemies
                        if (battlefield[side]["E"+ens] && battlefield[side]["E"+ens].hp.cur > 0){
                            utility.damage("E"+ens, Math.round(player.atk/2) , side,true);
                        }
                    }
                    deleteElement("Cannonball");
                },100);
                setTimeout(function(){deleteElement("CannonPlayer")},1500);
                return;
            }
            if (getNumber("cannonSlider") == 100 && !shouldRev) {//slider reversing conditions
                shouldRev = true;
                revolutions++;
            } else if (getNumber("cannonSlider") == 0 && shouldRev) {
                shouldRev = false;
                revolutions++;
            }
        });
    },
};

function shake(id, magnitude, times, decay) {// Advised magnitude: 10 or lower, TIME IS IN MILISECONDS
    var originalX = getProperty(id,"x");
    var originalY = getProperty(id,"y");
    var ti = 0;
    var mag = magnitude;

    var t = timedLoop(5, function() {
        if (ti >= times || mag <= 0.1) {
            stopTimedLoop(t);
            setPosition(id,originalX,originalY,getProperty(id,"width"),getProperty(id,"height"));
        } else {
            ti += 5;
            setPosition(id,originalX + randomNumber(-mag,mag),originalY + randomNumber(-mag,mag), getProperty(id,"width"),getProperty(id,"height"));
            if (decay && mag > 0.04) {mag *= 0.98}
        }
    });
}

//Animation index: {Name : Originalpos(x,y)}
var cacheAnims = {};

function bounce(id, direction) {
    var origins = {"x" : getProperty(id,"x"), "y" : getProperty(id,"y")};
    if (cacheAnims[id]) {origins.x = cacheAnims[id][0],origins.y = cacheAnims[id][1]} else {cacheAnims[id] = [origins.x,origins.y]}
    var inverse = false;
    if (direction.substring(0,1) === "-") {direction = direction.substring(1,2),inverse = true}

    setProperty(id,direction,!inverse && origins[direction]+10 ||(origins[direction])-10);

    var t = direction === "x" && new TweenService.create(id,{x: !inverse && origins[direction]-10 ||origins[direction]+10 },0.15,"Sine","In",120) || new TweenService.create(id,{y: !inverse && origins[direction]-10 ||origins[direction]+10 },0.15,"Sine","In",120);
    t.play();
    setTimeout(function(){
        var r = direction === "x" && new TweenService.create(id,{x : origins[direction]},0.15,"Sine","In",120) || new TweenService.create(id,{y : origins[direction]},0.15,"Sine","In",120);
        r.play();
    },150);
}

function gradientTransform(startColor, endColor, objectId, duration) {
    var startTime = getTime();
    var intervalId;
    if (!startColor) {
        var baseColor = stripRGBValues(getProperty(objectId,"background-color"));
        startColor = {red:baseColor.red,blue:baseColor.blue,green:baseColor.green};
    }

    this.play = function(modifiedDuration) { //you do not need to call this.play, it already does it upon creation
        if (modifiedDuration!=null){duration = modifiedDuration}
        intervalId = setInterval(function() {
            var time = (getTime() - startTime) / duration;
            if (time > 1) time = 1;

            var r = startColor.red + (endColor.red - startColor.red) * time;
            var g = startColor.green + (endColor.green - startColor.green) * time;
            var b = startColor.blue + (endColor.blue - startColor.blue) * time;

            setProperty(objectId, "background-color", rgb(r, g, b));

            if (time >= 1) {
                clearInterval(intervalId);
                return;
            }
        }, 40);
    };
    this.play();

    this.inversePlay = function(modifiedDuration){//changes color back to the startColor Arg.
        if (modifiedDuration!=null){duration = modifiedDuration}
        startTime = getTime();
        intervalId = setInterval(function() {
            var time = (getTime() - startTime) / duration;
            if (time > 1) time = 1;

            var r = endColor.red + (startColor.red - endColor.red) * time;
            var g = endColor.green + (startColor.green - endColor.green) * time;
            var b = endColor.blue + (startColor.blue - endColor.blue) * time;

            setProperty(objectId, "background-color", rgb(r, g, b));

            if (time >= 1) clearInterval(intervalId);
        }, 40);
    };
}

//example use cases of gradient transform
// var g = new gradientTransform( {red:255,green:20,blue:65},{red:0,green:26,blue:255} , "spinButton" , 500);
// setTimeout(function(){g.inversePlay(2000)},800);
// setTimeout(function(){var n = new gradientTransform({red:255,green:20,blue:65},{red:26,green:188,blue:61},"spinButton",600)},2800);

var activeNumberTweens = [];
var intervalIndex = 0;

function numberTween(startValue, endValue, duration,parent, text, onUpdate, onComplete) {
    if (activeNumberTweens[text]) {
        clearInterval(activeNumberTweens[text].interval);
        delete activeNumberTweens[text];
    }

    var startTime = Date.now();

    var tween = {
        parent : parent,
        text: text,
        interval: null,
        stop: function () {
            clearInterval(this.interval);
            delete activeNumberTweens[this.text];
            console.log('Tween '+this.text+' stopped manually');
        },
    };

    // Start the tween interval
    tween.interval = setInterval(function () {
        var t = (Date.now() - startTime) / duration;
        if (t > 1) t = 1;

        var eased = 1 - Math.pow(2, -10 * t);
        var value = startValue + (endValue - startValue) * eased;
        onUpdate(value);

        if (t >= 1) {
            onUpdate(endValue);
            clearInterval(tween.interval);
            delete activeNumberTweens[text];
            delete objectz[parent];
            if (onComplete) onComplete();
        }
    }, 30);

    activeNumberTweens[text] = tween;

    return tween;
}

var objectz = {
    nt : {name: "nt",text:"scoreLabel",intervalInst : 0,func : new numberTween(100, 50, 2000,"nt","scoreLabel", function(val) {//tweening a number to 50 in 2 seconds
            setText("scoreLabel", Math.floor(val));
        })},
    nt2 : {name: "nt2",text:"scoreLabel",intervalInst:0,func : new numberTween(25, 150, 2000,"nt2","scoreLabel", function(val) {//tweening a number to 50 in 2 seconds
            setText("scoreLabel", Math.floor(val));
        })},
};

//EVENT HANDLER SYSTEM; allows for asyncronous changes
//ONLY WORKS ON OBJECTS, CANNOT FUNCTION ON STANDALONE VARIABLES OR ARRAYS []
function createConnection(obj, key) { //the key has to come from the obj, the key is one of the obj's values
    if (obj["bind_"+key]) {return true} //use this to check the existence
    var internal = obj[key]; //Name of the object you want to modify

    var listeners = [];

    Object.defineProperty(obj, key, {
        get: function() {return internal},

        set: function(value){
            var incoming = Math.abs(internal - value)
            internal = value;
            listeners.forEach(function(callback) {callback(value,incoming)});
        }
    });

    if (!obj.statListeners) obj.statListeners = {};

    obj.statListeners[key] = listeners;

    obj["bind_"+key] = function(callback) {listeners.push(callback)};
    obj["unbind_"+key] = function(callback) {
        var index = listeners.indexOf(callback);
        if (index !== 1) {
            listeners.splice(index,1);
        }
    };
}

function saveGame(){
    //playerData already has the usernamePassword, dont do a search for it here
    var savedInternalData = "";
    var savedInventory = "";
    var savedCurrency = "";
    var savedStory = "";
    var savedEnchants = "";
    for (var data1 in internalData){
        savedInternalData += internalData[data1];
        if (data1 != internalData.length-1){savedInternalData+="/"}
    }
    for (var data2 in Inventory){
        savedInventory += Inventory[data2];
        if (data2 != Inventory.length-1){savedInventory+="/"}
    }
    var saveIndex = 0;
    for (var money in currency){
        if (saveIndex+2 > Object.keys(currency).length){
            savedCurrency+=(money+"~"+currency[money]);
        } else {
            savedCurrency+= (money+"~"+currency[money]+"/");
        }
        saveIndex++;
    }
    for (var equippedEnchants in enchants.equipped){savedEnchants+=(enchants.equipped[equippedEnchants]+"~"+true)+"/"}
    for (var dequippedEnchants in enchants.unequipped){savedEnchants+=(enchants.unequipped[dequippedEnchants]+"~"+false)+"/"}
    savedEnchants = savedEnchants.substring(0,savedEnchants.length-1);//remove the last "/" symbol
    savedStory += "Ch"+chapter+"/"+location+"/Section~"+section+"/SPart~"+SPart;
    // now run the update records function to save
    updateRecord("Users",{
        id:playerData.id,
        UsernamePassword: playerData.UsernamePassword,
        InternalData: savedInternalData,
        Currency:savedCurrency,
        XP: playerData.Xp,
        Inventory: savedInventory,
        Story: savedStory,
        EnchantData : savedEnchants,
    },function(){
        console.log("Saved!");
        playerData.internalData = savedInternalData;
        playerData.Currency = savedCurrency;
        player.Inventory = savedInventory;
        playerData.saveData = savedStory;
        playerData.EnchantData = savedEnchants;
    });
}
onEvent("Location","click",function(){setScreen("Lobby")});
onEvent("gameSave","click",function(){playSpeech("Saving game","male","English (UK)"),saveGame()});

function decodeData(Data,quantity) {
    console.log("recieved data:");
    console.log(Data);
    var dataPieces = Data.split("/");
    if (quantity) {
        var finalReturn = [];
        for (var i in dataPieces) {
            var value = dataPieces[i].split("~");
            if (value[1]==undefined){finalReturn.push(value[0]);
                continue}
            finalReturn.push([value[0],value[1]]);
        }
        return finalReturn;
    } else {return dataPieces}
}

//COMBAT MECHANICS ------------------/////////////////////////--------------------------------

var globalTarget; //for the utility function; updated alongside utility.Damage
var globalSide; //both of these must be updated so the game knows who to target

var dodgeQueue = [];
var attackDespawnOffset = 0;// to offset despawn timer
var globalNow = null;
var dodgeIndex = 0;

function dodgeLabel(dodgeType){
    instance.newImage("dodge_"+dodgeType+dodgeIndex,110,190,100,30,"Dodge_"+dodgeType+".png");
    bounce("dodge_"+dodgeType+dodgeIndex,"y");
    function dodgerDelete(dodge,index){setTimeout(function(){deleteElement("dodge_"+dodge+index)},1000);}
    dodgerDelete(dodgeType,dodgeIndex);
    dodgeIndex++;
}


function queueDodge(targetTime,expectedDamage, dodgeArray) {
    var startTime;
    if (dodgeQueue.length > 0) {
        startTime = dodgeQueue[0].TargetTime;
    } else {startTime = globalNow}
    var trialTime = startTime + targetTime;

    dodgeQueue.push({TargetTime : trialTime, dmg : expectedDamage,dodged : false, dodgeArray : dodgeArray});

    setTimeout(function(){
        if (dodgeQueue.length  === 1) {
            if (dodgeQueue[0].dodged == false) {
                dodgeLabel("Miss");
            }
            utility.damage(globalTarget,dodgeQueue[0].dmg, globalSide);
            dodgeQueue = [];
            attackDespawnOffset = 0;
            hideElement("DodgeButton");
            showElement("Button");
        } else {
            if (dodgeQueue[0].dodged == false) {
                dodgeLabel("Miss");
            }
            utility.damage(globalTarget,dodgeQueue[0].dmg, globalSide);
            dodgeQueue.shift();
        }
    },targetTime + attackDespawnOffset);
    attackDespawnOffset += targetTime;
}

function dodge(){
    if (dodgeQueue.length == 0 || dodgeQueue[0].dodged === true) {return}
    var timePressed = getTime();
    var targetTime = dodgeQueue[0].TargetTime;
    var offset = (targetTime - timePressed);

    var dmgReturn = null;

    if (dodgeQueue[0].dodged == true) {console.log("You already dodged bozo")}

    if (dodgeQueue[0].dodgeArray && offset < dodgeQueue[0].dodgeArray.Perfect || offset <200) { //perfect dodge
        dmgReturn = 0;
        dodgeQueue[0].dodged = true;
        dodgeLabel("Perfect");
    } else if (dodgeQueue[0].dodgeArray && offset < dodgeQueue[0].dodgeArray.Great || offset >200 && offset < 400) { //imperfect dodge
        dmgReturn = Math.round(dodgeQueue[0].dmg * 0.5);
        dodgeQueue[0].dodged = true;
        dodgeLabel("Great");
    }else if (dodgeQueue[0].dodgeArray && offset < dodgeQueue[0].dodgeArray.Okay || offset >400 && offset < 800){ //okay dodge
        dmgReturn = Math.round(dodgeQueue[0].dmg * 0.75);
        dodgeQueue[0].dodged = true;
        dodgeLabel("Okay");
    } else {
        dodgeLabel("Miss");
        playSound("OO_Miss.mp3");
        return;
    }
    dodgeQueue[0].dmg = dmgReturn;
}

onEvent("DodgeButton","click",function(){dodge()});
onEvent("Battle","keypress",function(input){if (getProperty("DodgeButton","hidden") === false && input.charCode===32) {dodge()}});
function startDodge(dodgeList){
    showElement("DodgeButton");
    globalNow = getTime();
    for (var d in dodgeList) {
        queueDodge(dodgeList[d].time,dodgeList[d].dmg, dodgeList[d].dodgeArray);
    }
}

//BATTLEFIELD SYSTEM -------------------//////////////////////------------------------------/////////////////
var act = null; //the name of the action
var actPressed = false; //prevent the action menu from being spammed

onEvent("Pass","click",function(){
    utility.grant(playerSlot,1,"allies","crg");
    setText("BattleBox","You decided to rest and gain back 1 crg!");
    showElement("Button");
    hideElement("Action");
    hideElement("Pass");
    hideElement("Item");
});

function setupTargetSelector(){
    setProperty("TargetSelector","options",[]);
    var total = ["None"];
    for (var ens in battlefield.enemies) {
        if (battlefield.enemies[ens] != null && battlefield.enemies[ens].hp.cur > 0) {total.push(ens.toString()+ " "+battlefield.enemies[ens].name)}
    }
    setProperty("TargetSelector","options",total);
}

function showActionMenu(){
    if (actPressed) {return}
    actPressed = true;
    instance.newLabel("BattleBorder_TEMP",65,110,190,210,rgb(170,79,37),"");
    hideElement("Item");
    hideElement("Action");
    hideElement("Pass");
    var y_o = 1;

    var elementList = ["BattleBorder_TEMP","BackT1"];

    instance.newButton("BackT1",65,70,100,30,rgb(2,2,2),"Back");
    onEvent("BackT1","click",function(){
        playSound("Back.mp3");
        for (var e in elementList) {deleteElement(elementList[e])}
        actPressed = false;
        act = null;
        showElement("Item");
        showElement("Action");
        showElement("Pass");
    });

    for (var moves in player.actions) {
        image("PLAYER_ICON_"+moves,moves+".png" || "nil.png");
        setPosition("PLAYER_ICON_"+moves,70,115+((y_o-1)*40),35,35);
        elementList.push("PLAYER_ICON_"+moves);
        instance.newLabel("PLAYER_"+moves,110,115+((y_o-1)*40),140,35,rgb(205, 155, 90),moves,rgb(255,255,255));
        if (player.actions[moves](null,null,true)>0){setText("PLAYER_"+moves,moves+" | "+player.actions[moves](null,null,true)+" CRG")}
        elementList.push("PLAYER_"+moves);
        y_o++;
        function bind(actionElement) {
            onEvent("PLAYER_"+actionElement,"click",function(){
                if (player.actions[actionElement](null,null,true) > battlefield.allies[playerSlot].crg.cur) {
                    setText("BattleBox","This action requires "+player.actions[actionElement](null,null,true)+ " CRG and you have "+battlefield.allies[playerSlot].crg.cur);
                    playSound("OO_Miss.mp3");
                    return;
                }
                playSound("Select.mp3");
                for (var e in elementList) { deleteElement(elementList[e]) }
                setupTargetSelector();
                showElement("TargetSelector");
                instance.newButton("BackT2",65,70,100,30,rgb(240,2,2),"Back");
                onEvent("BackT2","click",function(){
                    playSound("Back.mp3");
                    hideElement("TargetSelector");
                    deleteElement("BackT2");
                    actPressed = false;
                    act = null;
                    showActionMenu();
                });
                act = actionElement;
            });
        }
        bind(moves);
    }
}

onEvent("TargetSelector","change",function(){ //this is where the attack function actually executes
    playSound("Select.mp3");
    hideElement("Action");
    hideElement("Item");
    hideElement("Pass");
    if (getText("TargetSelector") == "None") {return}
    player.actions[act](getText("TargetSelector").substring(0,2),'enemies');
    hideElement("TargetSelector");
    deleteElement("BackT2");
    actPressed = false;
});

onEvent("Action","click",function(){showActionMenu(),playSound("Small_Click.mp3")});

var inventoryObjects = [];
var itemIndexBattle = 0;
function updateInventory(){
    var x_o = 0;
    var y_o = 0;
    for (var item in Inventory) {
        var foundItem = Inventory[item] || null;
        image(item+"_BatInv"+itemIndexBattle,items[foundItem].image || "Nil.png");
        setPosition(item+"_BatInv"+itemIndexBattle,10+(x_o*60),115+(y_o*60),50,50);
        inventoryObjects.push(item+"_BatInv"+itemIndexBattle);
        function bind(name,what){
            onEvent(name,"click",function(){
                playSound(items[what].snd||"Placeholder.mp3");
                if (getProperty("Use","width")){deleteElement("Use"),inventoryObjects.splice(inventoryObjects.indexOf("Use"),1)}
                inventoryObjects.push("Use");
                instance.newButton("Use",getProperty("DodgeButton","x"),getProperty("DodgeButton","y"),getProperty("DodgeButton","width"),getProperty("DodgeButton","height"),'#4b7bac',"Use");
                setText("BattleBox",items[what].desc);
                onEvent("Use","click",function(){
                    playSound("Select.mp3");
                    deleteElement("BackT1");
                    for (var e in inventoryObjects){deleteElement(inventoryObjects[e])}
                    inventoryObjects = [];
                    Inventory.splice(Inventory.indexOf(what),1);
                    if (battlefield.activeAllies.length>1){
                        dropdown("HealPicker","None","A1","A2"); //I am aware of modularity issues that come from this, but this build of BG won't need any change to ally system
                        setPosition("HealPicker",60,130,200,30);
                        onEvent("HealPicker","change",function(){
                            utility.heal(getText("HealPicker"),items[what].heal || 0,"allies");
                            deleteElement("HealPicker");
                            showElement("Button");
                        });
                    } else {
                        utility.heal("A1",items[what].heal || 0,"allies");
                        showElement("Button");
                    }
                });

            });
        }
        bind(item+"_BatInv"+itemIndexBattle,foundItem);
        if (x_o>3) {x_o=0,y_o++} else {x_o++}
        itemIndexBattle++;
    }
}

onEvent("Item","click",function(){
    if (actPressed) {return}
    playSound("Small_Click.mp3");
    hideElement("Item");
    hideElement("Action");
    hideElement("Pass");
    instance.newButton("BackT1",65,70,100,30,rgb(2,2,2),"Back");
    onEvent("BackT1","click",function(){
        playSound("Back.mp3");
        showElement("Pass");
        showElement("Action");
        showElement("Item");
        for (var e in inventoryObjects){deleteElement(inventoryObjects[e])}
        inventoryObjects = [];
        deleteElement("BackT1");
    });
    instance.newLabel("InvBackground",5,110,310,125,rgb(79, 138, 113),"");
    instance.newLabel("InvBackground2",305,110,10,125,rgb(44, 90, 70),"");
    inventoryObjects.push("InvBackground");
    inventoryObjects.push("InvBackground2");
    updateInventory();
});

onEvent("DeathContinue","click",function(){loadPlayerData()});

function endBattle(win){
    console.clear();
    externalDiaIndex=0;
    stopSound(curSong);
    setText("BattleBox","");
    var xpYield = 0;
    turnOrder = [];
    turnIndex = 0;
    var mes = getText("BattleBox") + "\n";
    for (var effect in cacheEffects){deleteElement(cacheEffects[effect])}
    cacheEffects = [];
    mes += win && "You WON!"+"\n" || "You Lost!"+"\n";
    switch (win){
        case true:
            var prevLevel = level;
            xpYield += battlefield.enemies.E1.xp;
            var goldGained = 0;
            for (var enemyIndex = 1; enemyIndex<=4;enemyIndex++){
                if (battlefield.enemies["E"+enemyIndex] && battlefield.enemies["E"+enemyIndex].rewards){
                    if (battlefield.enemies["E"+enemyIndex].rewards.Gold) {goldGained+=battlefield.enemies["E"+enemyIndex].rewards.Gold}
                    else if (battlefield.enemies["E"+enemyIndex].rewards.Item &&  Inventory.length<=8) {Inventory.push(battlefield.enemies["E"+enemyIndex].rewards.Item)}
                }
            }
            currency.Gold = Number(currency.Gold) + goldGained;
            if (battlefield.enemies.E2) {xpYield += battlefield.enemies.E2.xp}
            if (battlefield.enemies.E3) {xpYield += battlefield.enemies.E3.xp}
            mes += xpYield+" xp gained!\n "+goldGained+" Gold earned!";
            playerData.Xp += xpYield;
            updatePlayerLevels();
            if (level != prevLevel){
                mes+= ("You also leveled up!: | "+prevLevel+" -> "+level);
            }
            stopSound();
            playSound("OO_Victory.mp3");
            setText("BattleBox",mes);
            setTimeout(function(){
                sceneBuilder(world[location]);
                setProperty("Enemy1","border-width",0);
                setProperty("Enemy2","border-width",0);
                setProperty("Enemy3","border-width",0);
                setProperty("Ally1","border-width",0);
                setProperty("Ally2","border-width",0);
                setPosition("Enemy1HPBar",265,119,50,11);
                setPosition("Enemy2HPBar",265,189,50,11);
                setPosition("Enemy3HPBar",265,159,50,11);
                setText("BattleBox","Awaiting input...\n its your turn by the way");
            },5000);
            break;
        default:
            setScreen("DeathScreen");
            var invert = true;
            var time = 250;
        function tickD(){
            if (time <=0){return}
            setProperty("BgC","background-color", !invert && rgb(255,255,255) || rgb(0,0,0));
            time -=50;
            invert = !invert;
            setTimeout(function(){tickD()},50);
        }
            tickD(250);

            setTimeout(function(){
                showElement("DeathContinue");
                showElement("Grace_Message");
                playSound("OO_Searchlights.mp3",true);
            },250);

            curSong = "OO_Searchlights.mp3";
    }

    battlefield = {
        "allies" : {
            A1 : null,
            A2 : null,
        },
        "enemies" : {
            E1 : null,
            E2 : null,
            E3 : null
        },
        activeAllies : [],
        activeEnemies : [],
    };
}

function activeFailsafe(){ //active entities list gets messed up from lag spikes or random updates
    battlefield.activeAllies = [];
    battlefield.activeEnemies = [];
    for (var ai =1;ai<=2;ai++){
        if (battlefield.allies["A"+ai] && battlefield.allies["A"+ai].hp.cur>0){
            battlefield.activeAllies.push(ai);
        }
    }
    for (var ei = 1; ei<=3;ei++){
        if (battlefield.enemies["E"+ei] && battlefield.enemies["E"+ei].hp.cur>0){
            battlefield.activeEnemies.push("E"+ei);
        }
    }
}

var turnOrder = [];
var turnIndex = 0;
function cycle() {
    hideElement("Button");

    //sometimes, the game can lag and we have items not in the right place; fix that
    setPosition("Enemy1",265,125,50,50);
    setPosition("Enemy2",265,195,50,50);
    setPosition("Enemy3",265,265,50,50);

    var skipThem = false;

    if (battlefield[turnOrder[turnIndex][0]][turnOrder[turnIndex][1]].hp.cur > 0){
        skipThem = false;
    } else {skipThem = true}

    var allyFlag = [];
    var enemyFlag = [];

    for (var ally in battlefield.allies) {
        if (battlefield.allies[ally]==undefined){continue}
        if (battlefield.allies[ally].hp.cur <= 0 || skipThem == true) {break}
        battlefield.allies[ally].atk.cur = battlefield.allies[ally].atk.max;
        battlefield.allies[ally].def.cur = battlefield.allies[ally].def.max;

        if (battlefield.allies[ally].buffs){
            for (var buff in battlefield.allies[ally].buffs) {
                if (battlefield.allies[ally].buffs[buff].dur === 0) {
                    deleteElement(buff+battlefield.allies[ally].buffs[buff].index);
                    deleteElement(buff+battlefield.allies[ally].buffs[buff].index+"_dur");
                    deleteElement(buff+battlefield.allies[ally].buffs[buff].index+"_stack");
                    cacheEffects.splice(cacheEffects.indexOf(buff+battlefield.allies[ally].buffs[buff].index),1);
                    cacheEffects.splice(cacheEffects.indexOf(buff+battlefield.allies[ally].buffs[buff].index+"_dur"),1);
                    cacheEffects.splice(cacheEffects.indexOf(buff+battlefield.allies[ally].buffs[buff].index+"_stack"),1);
                    delete battlefield.allies[ally].buffs[buff];
                    continue}
                battlefield.allies[ally].buffs[buff].dur -= 1;
                setText(buff+battlefield.allies[ally].buffs[buff].index+"_dur",battlefield.allies[ally].buffs[buff].dur);
                if (battlefield.allies[ally].buffs[buff].stat === "hp") { //probably means it'll do dmg
                    utility.heal(ally,battlefield.allies[ally].buffs[buff].amp * battlefield.allies[ally].buffs[buff].stack ,"allies");
                } else if (battlefield.allies[ally].buffs[buff].stat === "def"){
                    utility.take(ally,battlefield.allies[ally].buffs[buff].amp * battlefield.allies[ally].buffs[buff].stack, "allies");
                } else if (battlefield.allies[ally].buffs[buff].stat === "atk") {
                    utility.take(ally,battlefield.allies[ally].buffs[buff].amp * battlefield.allies[ally].buffs[buff].stack, "allies");
                }
            }
        }

        if (battlefield.allies[ally].debuffs){
            for (var debuff in battlefield.allies[ally].debuffs) {
                if (battlefield.allies[ally].debuffs[debuff].dur === 0) {
                    deleteElement(debuff+battlefield.allies[ally].debuffs[debuff].index);
                    deleteElement(debuff+battlefield.allies[ally].debuffs[debuff].index+"_dur");
                    deleteElement(debuff+battlefield.allies[ally].debuffs[debuff].index+"_stack");
                    cacheEffects.splice(cacheEffects.indexOf(debuff+battlefield.allies[ally].debuffs[debuff].index),1);
                    cacheEffects.splice(cacheEffects.indexOf(debuff+battlefield.allies[ally].debuffs[debuff].index+"_dur"),1);
                    cacheEffects.splice(cacheEffects.indexOf(debuff+battlefield.allies[ally].debuffs[debuff].index+"_stack"),1);
                    delete battlefield.allies[ally].debuffs[debuff];
                    continue}
                battlefield.allies[ally].debuffs[debuff].dur -= 1;
                setText(debuff+battlefield.allies[ally].debuffs[debuff].index+"_dur",battlefield.allies[ally].debuffs[debuff].dur);
                if (battlefield.allies[ally].debuffs[debuff].stat === "hp") { //probably means it'll do dmg
                    utility.damage(ally,-battlefield.allies[ally].debuffs[debuff].amp * battlefield.allies[ally].debuffs[debuff].stack ,"allies",true);
                } else if (battlefield.allies[ally].debuffs[debuff].stat === "def"){
                    utility.take(ally,-battlefield.allies[ally].debuffs[debuff].amp * battlefield.allies[ally].debuffs[debuff].stack, "allies",battlefield.allies[ally].debuffs[debuff].stat);
                } else if (battlefield.allies[ally].debuffs[debuff].stat === "atk") {
                    utility.take(ally,-battlefield.allies[ally].debuffs[debuff].amp * battlefield.allies[ally].debuffs[debuff].stack, "allies",battlefield.allies[ally].debuffs[debuff].stat);
                }
            }
        }
    }
    for (var enemy in battlefield.enemies) {
        if (battlefield.enemies[enemy]==undefined){continue}
        if (battlefield.enemies[enemy].hp.cur <= 0 || skipThem == true) {break}
        if (battlefield.enemies[enemy].debuffs){
            for (var dbuff in battlefield.enemies[enemy].debuffs) {
                if (battlefield.enemies[enemy].debuffs[dbuff].dur === 0) {
                    deleteElement(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index);
                    deleteElement(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index+"_dur");
                    deleteElement(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index+"_stack");
                    cacheEffects.splice(cacheEffects.indexOf(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index),1);
                    cacheEffects.splice(cacheEffects.indexOf(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index+"_dur"),1);
                    cacheEffects.splice(cacheEffects.indexOf(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index+"_stack"),1);
                    delete battlefield.enemies[enemy].debuffs[dbuff];
                    continue}
                battlefield.enemies[enemy].debuffs[dbuff].dur -= 1;
                setText(dbuff+battlefield.enemies[enemy].debuffs[dbuff].index+"_dur",battlefield.enemies[enemy].debuffs[dbuff].dur);
                if (battlefield.enemies[enemy].debuffs[dbuff].stat === "hp") {
                    utility.damage(enemy,-battlefield.enemies[enemy].debuffs[dbuff].amp * battlefield.enemies[enemy].debuffs[dbuff].stack ,"enemies",true);
                } else if(battlefield.enemies[enemy].debuffs[dbuff].stat === "turn") {
                    skipThem = true;
                }
            }
        }
    }

    for (var ally in battlefield.allies) {
        if (battlefield.allies[ally] && battlefield.allies[ally].hp.cur == 0 ){
            allyFlag.push(0);
        } else {
            if (!battlefield.allies[ally]) {continue}
            allyFlag.push(1);
        }
    }
    for (var enemy in battlefield.enemies) {
        if (battlefield.enemies[enemy] && battlefield.enemies[enemy].hp.cur <= 0 ){enemyFlag.push(0);} else {
            if (!battlefield.enemies[enemy]) {continue}
            enemyFlag.push(1);
        }
    }
    if (allyFlag.every(function(hp){return hp ===0})){
        endBattle(false);
        return;
    }
    if (enemyFlag.every(function(hp){return hp ===0})){
        endBattle(true);
        return;
    }
    if (skipThem == false) {
        battlefield[turnOrder[turnIndex][0]][turnOrder[turnIndex][1]].logic(turnOrder[turnIndex][0],turnOrder[turnIndex][1]);
    }

    if (turnIndex + 1 > turnOrder.length - 1) {turnIndex = 0} else {turnIndex++}
    if (skipThem) {cycle()}
}

onEvent("Button","click",function(){cycle(),playSound("Small_Click.mp3");});

function speech(side, who) {
    textLabel("Message_"+who ,battlefield[side][who].messages[randomNumber(0,battlefield[side][who].messages.length-1)]);
    setProperty("Message_"+who,"text-align",side === "allies" && "left" || "right");
    setPosition("Message_"+who ,side === "allies" && 65 || 200,75 + (50 * parseInt(who.substring(1,2))),getProperty("Message_"+who,"width"),getProperty("Message_"+who,"height"));
    setProperty("Message_"+who,"background-color",rgb(255,255,255,0.5));
    setProperty("Message_"+who,"border-width",1);
    setTimeout(function(){deleteElement("Message_"+who)},5000);
}
function startBattle(enemies,setTeam,sndTrack) {
    hideElement("Enemy2");
    hideElement("Enemy3");
    hideElement("Enemy2HPLabel");
    hideElement("Enemy2HPBar");
    hideElement("Enemy3HPLabel");
    hideElement("Enemy3HPBar");
    hideElement("Ally2");
    hideElement("Ally2HP");
    hideElement("Ally2HPLabel");
    for (var element in currentSceneElements){deleteElement(currentSceneElements[element])}
    setProperty("Ally1HP","background-color",rgb(0,255,0));
    setProperty("Ally2HP","background-color",rgb(0,255,0));

    stopSound(curSong);
    var songBank = ["Alias.mp3","OO_Witches_Brew.mp3","tale_4.mp3"];//music according to the BG should play but I didn't have enough time
    curSong = sndTrack || songBank[randomNumber(0,songBank.length-1)];
    curSong = "OO_Witches_Brew.mp3";
    playSound(curSong,true);

    var t2 = new TweenService.create("Bat_Transition", {y : -450},0.8,'Sine','In',60);
    t2.play();
    if (!enemies) {Error("WARNING: INVALID ENEMY DATA RECIEVED")}

    var teamIndex = 1;
    var enemyIndex = 1;

    setScreen("Battle");

    for (var member in setTeam) {
        setImageURL("Enemy"+teamIndex,setTeam[member].image || "Nil.png");
        battlefield.allies["A"+teamIndex.toString()] = {
            hp : {cur : setTeam[member].hp, max : setTeam[member].hp},
            atk : {cur: setTeam[member].atk,max:setTeam[member].atk},
            def : {cur: setTeam[member].def, max: setTeam[member].def},
            crg: {cur: setTeam[member].crg || 0, max: setTeam[member].crg || 0},
            buffs : {},
            debuffs :{},
            action : setTeam[member].action,
            logic : setTeam[member].logic,
            messages : setTeam[member].messages,
            name : setTeam[member].Name,
            self : "A"+teamIndex,
        };
        function addBind(entityIndex) {
            createConnection(battlefield.allies["A"+entityIndex].hp,'cur');
            battlefield.allies["A"+entityIndex].hp.bind_cur(function(){
                if (battlefield.allies["A"+entityIndex].hp.cur===0) {
                    battlefield.activeAllies.splice(battlefield.activeAllies.indexOf(entityIndex),1);
                    activeFailsafe();
                }
                objectz["nt"+intervalIndex] = numberTween(Number(getText("Ally"+entityIndex+"HP").split("/")[0]), battlefield.allies["A"+entityIndex].hp.cur, 5000,"nt"+intervalIndex,"Ally"+entityIndex+"HP", function(val) {//tweening a number to 50 in 2 seconds
                    setText("Ally"+entityIndex+"HP", Math.floor(val)+"/"+getText("Ally"+entityIndex+"HP").split("/")[1]);
                },function(){delete objectz["nt"+intervalIndex]});
                var ratio = battlefield.allies["A"+entityIndex].hp.cur / battlefield.allies["A"+entityIndex].hp.max;
                var gradientShift = new gradientTransform(
                    null,
                    {red:Math.floor(255 * (1-ratio)),blue:20,green:Math.floor(255 * ratio)},
                    "Ally"+entityIndex+"HP",
                    5000
                );
            });
            createConnection(battlefield.allies["A"+entityIndex].crg,'cur');
            battlefield.allies["A"+entityIndex].crg.bind_cur(function(){
                objectz["nc"+intervalIndex] = numberTween(Number(getText("Ally"+entityIndex+"CRG").split("/")[0]), battlefield.allies["A"+entityIndex].crg.cur, 5000,"nc"+intervalIndex,"Ally"+entityIndex+"CRG", function(val) {
                    setText("Ally"+entityIndex+"CRG", Math.floor(val)+"/"+getText("Ally"+entityIndex+"CRG").split("/")[1]);
                },function(){delete objectz["nc"+intervalIndex]});
            });
        }
        addBind(teamIndex);

        turnOrder.push(["allies","A"+teamIndex]);
        battlefield.activeAllies.push(teamIndex);
        showElement("Ally"+teamIndex);
        showElement("Ally"+teamIndex.toString()+"HPLabel");
        showElement("Ally"+teamIndex.toString()+"HP");
        setText("Ally"+teamIndex.toString()+"HPLabel",setTeam[member].Name);
        setText("Ally"+teamIndex.toString()+"HP",setTeam[member].hp+"/"+setTeam[member].hp);
        teamIndex += 1;
    }

    for (var member in enemies) {
        setImageURL("Enemy"+enemyIndex,enemies[member].image || "Nil.png");
        battlefield.enemies["E"+enemyIndex.toString()] = {
            hp : {cur : enemies[member].hp, max : enemies[member].hp}, //the reason for the repeat is the current and max values
            atk : {cur : enemies[member].atk, max : enemies[member].atk},
            def : {cur : enemies[member].def, max : enemies[member].def},
            buffs : {},
            debuffs :{}, //kicks in at the start of their turn
            action : enemies[member].action,
            logic : enemies[member].logic,
            name : enemies[member].name,
            messages : enemies[member].messages,
            xp: enemies[member].xp || 1,
            rewards : enemies[member].rewards || null,
        };
        function addBindE(entityIndex){
            createConnection(battlefield.enemies["E"+entityIndex].hp,'cur');
            battlefield.enemies["E"+entityIndex].hp.bind_cur(function(){
                if (battlefield.enemies["E"+entityIndex].hp.cur == 0) {
                    setProperty("Enemy"+entityIndex,"border-width",25);
                    var enemyAlpha = 1;
                    function tickDeath2(){
                        enemyAlpha -= 0.05;
                        setTimeout(function(){
                            if (enemyAlpha <=0.1){
                                setProperty("Enemy"+entityIndex,"border-color",rgb(255,255,255,enemyAlpha));
                                return;
                            }
                            setProperty("Enemy"+entityIndex,"border-color",rgb(255,255,255,enemyAlpha));
                            tickDeath2();
                        },50);
                    }
                    tickDeath2();
                    battlefield.activeEnemies.splice(battlefield.activeEnemies.indexOf("E"+entityIndex),1);
                    activeFailsafe();
                }
                setPosition("Enemy"+entityIndex+"HPBar",265,49+(entityIndex*70),50*(battlefield.enemies["E"+entityIndex].hp.cur/battlefield.enemies["E"+entityIndex].hp.max),10);
                setText("Enemy"+entityIndex+"HPLabel",battlefield.enemies["E"+entityIndex].hp.cur+"/"+ battlefield.enemies["E"+entityIndex].hp.max);
                setPosition("Hurt_E"+entityIndex,
                    getProperty("Enemy"+entityIndex,"x")+(getProperty("Enemy"+entityIndex,"width")/2),
                    getProperty("Enemy"+entityIndex,"y")+(getProperty("Enemy"+entityIndex,"height")/2),
                    getProperty("Enemy"+entityIndex,"width"),
                    getProperty("Enemy"+entityIndex,"height")
                );
            });
        }
        addBindE(enemyIndex);

        turnOrder.push(["enemies","E"+enemyIndex]);
        battlefield.activeEnemies.push("E"+enemyIndex);
        showElement("Enemy"+enemyIndex);
        showElement("Enemy"+enemyIndex+"HPBar");
        showElement("Enemy"+enemyIndex+"HPLabel");
        setPosition("Enemy"+enemyIndex+"HPBar",265,50+(enemyIndex*70),50*(enemies[member].hp.cur/enemies[member].hp.max),10);
        setText("Enemy"+enemyIndex+"HPLabel",enemies[member].hp+"/"+ enemies[member].hp);
        enemyIndex = enemyIndex + 1;
    }

    for (var a in battlefield.allies) {
        if (battlefield.allies[a]==undefined){continue}
        if (randomNumber(1,2) > 1) {
            function nul (t){setTimeout(function(){speech("allies",t)},randomNumber(1000,3000))};
            nul(a);
            continue;
        }
    }

    for (var y in battlefield.enemies) {
        if (battlefield.enemies[y]==undefined){continue}
        if (randomNumber(1,10) > 3) {
            function nil (b){setTimeout(function(){speech("enemies",b)},randomNumber(1000,3000))}
            nil(y);
            continue;
        }
    }
    setPosition("Ally1",-50,125,50,50);
    setPosition("Ally2",-50,195,50,50);
    setPosition("Enemy1",325,125,50,50);
    setPosition("Enemy2",325,195,50,50);
    setPosition("Enemy3",325,265,50,50);
    var Tw1 = new TweenService.create("Ally1",{x:10},0.8,'Sine','In',60);
    var Tw2 = new TweenService.create("Ally2",{x:10},0.95,'Sine','In',60);
    var Tw3 = new TweenService.create("Enemy1",{x:260},0.8,'Sine','In',60);
    var Tw4 = new TweenService.create("Enemy2",{x:260},0.95,'Sine','In',60);
    var Tw5 = new TweenService.create("Enemy3",{x:260},1.1,'Sine','In',60);

    Tw1.play();
    Tw2.play();
    Tw3.play();
    Tw4.play();
    Tw5.play();
    cycle();
}

var currentInventoryItems = [];
function createInventoryItems(){
    if (currentInventoryItems.length > 0) {
        for (var obj in currentInventoryItems) {
            deleteElement("Inventory_"+currentInventoryItems[obj]);
            deleteElement("InventoryLabel_"+currentInventoryItems[obj]);
        }
        currentInventoryItems = [];
    }

    var x_offset = 0;
    var y_offset = 0;

    for (var item in Inventory){
        image("Inventory_"+item,items[Inventory[item]].image);
        currentInventoryItems.push(item);
        setPosition("Inventory_"+item,10+(x_offset*150),50+(y_offset*65),60,60);
        instance.newLabel("InventoryLabel_"+item,75+(x_offset*150),50+(y_offset*65),80,60,rgb(255,252,255,0),items[Inventory[item]].name);

        function nest(it){//create the item elements
            onEvent("Inventory_"+it,"click",function(){
                hideElement("back4");
                instance.newLabel("BgTEMP",5,45,310,330,rgb(69,69,69),"");
                image("ObjectTemp",items[Inventory[it]].image);
                setPosition("ObjectTemp",10,50,100,100);
                instance.newButton("DeleteTempInv",10,160,100,30,rgb(187,58,28),"delete");
                instance.newButton("BackButtonTemp",10,200,100,30,rgb(145,188,26),"back");
                instance.newButton("ItemText",165,50,145,145,rgb(0,0,0,0),items[Inventory[it]].desc)
                onEvent("DeleteTempInv","click",function(){
                    Inventory.splice(Inventory.indexOf(Inventory[it]),1);
                    deleteElement("BgTEMP");
                    deleteElement("ObjectTemp");
                    deleteElement("DeleteTempInv");
                    deleteElement("BackButtonTemp");
                    deleteElement("ItemText");
                    showElement("back4");
                    createInventoryItems();
                });
                onEvent("BackButtonTemp","click",function(){
                    showElement("back4");
                    deleteElement("BgTEMP");
                    deleteElement("ObjectTemp");
                    deleteElement("DeleteTempInv");
                    deleteElement("BackButtonTemp");
                    deleteElement("ItemText");
                });
            });
        }
        nest(item);

        if (y_offset >= 4) {
            y_offset = 0;
            x_offset++;
        } else if (y_offset<4){
            y_offset++;
        }
    }
}
onEvent("back4","click",function(){setScreen("Lobby")});

onEvent("InventoryButton","click",function(){playSound("Small_Click.mp3"),setScreen("Inventory"),createInventoryItems()});
var buyPositions = {
    shopBuyBG : {x:5,y:5,width:205,height:340},
    shopBuyLabel : {x:5,y:5,width:205,height:45},
    shopBuyName : {x:5,y:65,width:205,height:20},
    shopBuyImage : {x:60,y:135,width:100,height:100},
    shopBuyButton : {x:70,y:270,width:80,height:30}
};
//SHOP HANDLER -------------------------------------///////////////////////////////////////////////////-------------
var shop = {
    shopElements : [],
    shopKeeperImage : "nil.png",
    shopItems : {},
    update:function(newItems){
        if (this.shopElements.length > 0) {
            for (var eachElement in this.shopElements) {
                deleteElement(this.shopElements[eachElement]);
            }
            this.shopElements = [];
        }
        setText("moneyLabel","You have $"+currency.Gold+"\n Inventory: "+Inventory.length+"/10 items");
        for (var shopItems in newItems){
            instance.newLabel("ShopBG_"+shopItems,10,10+(65*shopItems-1),195,60,rgb(138,138,138),"");
            setProperty("ShopBG_"+shopItems,"border-width",2);
            setProperty("ShopBG_"+shopItems,"border-radius",2);
            instance.newImage("ShopPlaceholder_"+shopItems,5,5+(65*shopItems-1),70,70,"ItemFrame.png");
            instance.newImage("ShopImage_"+shopItems,15,15+(65*shopItems),50,50,items[newItems[shopItems]].image);
            instance.newLabel("ShopText_"+shopItems,80,30+(65*shopItems),120,50,rgb(255,255,255,0),items[newItems[shopItems]].name +": $"+items[newItems[shopItems]].price,rgb(255,255,255));
            instance.newLabel("ShopButton_"+shopItems,10,10+(65*shopItems-1),195,60,rgb(138,138,138,0),"");
            this.shopElements.push("ShopImage_"+shopItems);
            this.shopElements.push("ShopText_"+shopItems);
            this.shopElements.push("ShopPlaceholder_"+shopItems);
            this.shopElements.push("ShopButton_"+shopItems);
            this.shopElements.push("ShopBG_"+shopItems);
            function shopClick(index){
                onEvent("ShopButton_"+index,"click",function(){
                    if (currency.Gold < items[newItems[index]].price) {
                        gradientTransform({red:255,green:0,blue:0},{red:138,green:138,blue:138},"ShopBG_"+index,500);
                        shake("ShopBG_"+index,5,1000,true);
                        shake("ShopPlaceholder_"+index,5,1000,true);
                        shake("ShopImage_"+index,5,1000,true);
                        shake("ShopText_"+index,5,1000,true);
                        shake("ShopButton_"+index,5,1000,true);
                        playSound("OO_Miss.mp3");
                        return;
                    }
                    playSound("Small_Click.mp3");
                    setText("shopDesc",items[newItems[index]].desc);
                    instance.newLabel("InvisBlockerShop",0,0,320,450,rgb(0,0,0,0),"");
                    instance.newLabel("shopBuyBG",-205,5,205,340,rgb(140, 130, 92),"");
                    instance.newLabel("shopBuyLabel",-205,5,205,45,rgb(0,0,0,0),"BUY",rgb(255,255,255));
                    setProperty("shopBuyLabel","text-align","center");
                    instance.newLabel("shopBuyName",-205,65,205,20,rgb(0,0,0,0),items[newItems[index]].name+" for $"+items[newItems[index]].price+"?",rgb(255,255,255));
                    setProperty("shopBuyName","text-align","center");
                    instance.newImage("shopBuyImage",-60,135,100,100,items[newItems[index]].image);
                    instance.newButton("shopBuyButton",-70,270,80,30,rgb(26, 188, 61),"Buy",rgb(255,255,255));
                    instance.newButton("shopBuyBack",-70,310,80,30,rgb(186, 88, 61),"Back",rgb(255,255,255));
                    var s1 = new TweenService.create("shopBuyBG",{x:5},0.3,'Sine',"Out",60);
                    s1.play();
                    var s2 = new TweenService.create("shopBuyLabel",{x:5},0.3,'Sine',"Out",60);
                    s2.play();
                    var s3 = new TweenService.create("shopBuyName",{x:5},0.3,'Sine',"Out",60);
                    s3.play();
                    var s4 = new TweenService.create("shopBuyImage",{x:60},0.3,'Sine',"Out",60);
                    s4.play();
                    var s5 = new TweenService.create("shopBuyButton",{x:70},0.3,'Sine',"Out",60);
                    s5.play();
                    var s6 = new TweenService.create("shopBuyBack",{x:70},0.3,'Sine',"Out",60);
                    s6.play();
                    onEvent("shopBuyButton","click",function(){
                        if (Inventory.length >= 10){playSound("OO_Miss.mp3");
                            return}
                        if (items[newItems[index]].price>currency.Gold) {playSound("OO_Miss.mp3");
                            return}
                        instance.newLabel("BuySlide",5,5,205,340,rgb(0,225,0),"");
                        var t1 = new TweenService.create("BuySlide",{x:-205},0.2,'Sine','Out',60);
                        t1.play();
                        setTimeout(function(){
                            deleteElement("BuySlide");
                        },200);
                        currency.Gold-=items[newItems[index]].price;
                        Inventory.push(items[newItems[index]].name);
                        setText("moneyLabel","You have $"+currency.Gold+"\n Inventory: "+Inventory.length+"/10 items");
                        playSound("sound://category_collect/collect_item_bling_1.mp3");
                    });
                    onEvent("shopBuyBack","click",function(){
                        playSound("Select.mp3");
                        setText("shopDesc","Click on an item to get started!");
                        var s1 = new TweenService.create("shopBuyBG",{x:-205},0.3,'Sine',"In",60);
                        s1.play();
                        var s2 = new TweenService.create("shopBuyLabel",{x:-205},0.3,'Sine',"In",60);
                        s2.play();
                        var s3 = new TweenService.create("shopBuyName",{x:-205},0.3,'Sine',"In",60);
                        s3.play();
                        var s4 = new TweenService.create("shopBuyImage",{x:-120},0.3,'Sine',"In",60);
                        s4.play();
                        var s5 = new TweenService.create("shopBuyButton",{x:-140},0.3,'Sine',"In",60);
                        s5.play();
                        var s6 = new TweenService.create("shopBuyBack",{x:-140},0.3,'Sine',"In",60);
                        s6.play();
                        setTimeout(function(){
                            deleteElement("InvisBlockerShop");
                            deleteElement("shopBuyBG");
                            deleteElement("shopBuyLabel");
                            deleteElement("shopBuyName");
                            deleteElement("shopBuyImage");
                            deleteElement("shopBuyButton");
                            deleteElement("shopBuyBack");
                        },300);
                    });
                });
            }
            shopClick(shopItems);
        }
    },
    view: function(song,image){
        stopSound(curSong);
        curSong = song;
        playSound(curSong);
        setImageURL("shopKeeperImage",image || "Nil.png");
        setScreen("shopScreen");
    }
};

onEvent("ShopExit","click",function(){
    for (var element in currentSceneElements){deleteElement(currentSceneElements[element])}

    stopSound();
    sceneBuilder(world[location]);
});

var enchantDescriptions = {
    "sword-m1": "deal your atk worth of dmg + 1, if you miss it will always do 1 dmg",
    "sword-m2": "deal your atk + 3 worth of dmg, if you miss, you do your regular atk, costs 3 crg to execute",
    "staff-m1": "deal your atk and apply a fire debuff, unsuccessful controls will only deal 1 dmg and not apply fire, ",
    "staff-m2": "deal your atk + 2 worth of dmg, and apply a random debuff, costs 3 crg to execute, unsuccessful controls deal 3 dmg flat, this is SIGNIFICANTLY HARDER than the regular staff!",
    "bow-m1"  : "deal your atk - 3 dmg (min of 1 dmg) through up to 7 shots dealing 1 dmg each, but each have a 1/2 chance to double their dmg, very powerful if combined with defense shred",
    "bow-m2"  : "deal your atk + 5 worth of dmg, costs 5 crg, happens all in 1 shot",
    "cannon-m1": "deal 1/2 of your atk worth of dmg to ALL ENEMIES, also pierces defense",
    "cannon-m2": "deal 1/2 of your atk 3 times to a singular enemy, inflicts defense shred if you hit your last shot, costs 3 crg",
};

var enchantElementList=[];
var unequipMode = false;
//ENCHANT SYSTEM -- enchants function as equippable moves for now
var enchants = {
    equipped: [],
    unequipped : [],

    show: function(){
        var x_offset = 0;
        var y_offset = 0;
        for (var enchant in enchants.equipped) {
            instance.newImage("enchant_equipped_"+enchants.equipped[enchant],10+(x_offset*55),40+(y_offset*55),50,50,enchants.equipped[enchant]+".png");

            function setButton(ench){
                onEvent("enchant_equipped_"+ench,"click",function(){
                    if (unequipMode === true){
                        var ind = enchants.equipped.indexOf(ench);
                        deleteElement("enchant_equipped_"+ench);
                        enchants.equipped.splice(ind,1);
                        enchants.unequipped.push(ench);
                    } else {
                        instance.newLabel("BackgroundEnchants",5,5,310,435,rgb(38,39,135),"");
                        enchantElementList.push("BackgroundEnchants");
                        instance.newImage("Image_"+ench,10,10,100,100,ench+".png");
                        enchantElementList.push("Image_"+ench);
                        instance.newLabel("Label_"+ench,160,10,150,200,rgb(20,20,20),enchantDescriptions[ench],rgb(255,255,255));
                        enchantElementList.push("Label_"+ench);
                        instance.newButton("backTempEnchants",10,405,300,30,rgb(188,59,26),"back");
                        enchantElementList.push("backTempEnchants");
                        onEvent("backTempEnchants","click",function(){
                            for (var enchant in enchants.equipped) {deleteElement("enchant_equipped_"+enchants.equipped[enchant])}
                            for (var element in enchantElementList){deleteElement(enchantElementList[element])}
                            enchantElementList = [];
                            enchants.show();
                        });
                    }
                });
            }
            setButton(enchants.equipped[enchant]);

            if (x_offset>=4){
                x_offset = 0;
                y_offset++;
            } else {x_offset++}
        }
    },

    update : function(){
        setText("enchantLabel",enchants.equipped.length+"/6 moves equipped");
        for (var enchant in enchants.equipped) {
            player.actions[enchants.equipped[enchant]] = moves[enchants.equipped[enchant]];
        }
    },
};

onEvent("unequipButton","click",function(){
    unequipMode  = !unequipMode;
    if(unequipMode === true){
        setProperty("unequipButton","background-color",rgb(51,163,75));
    }else{
        setProperty("unequipButton","background-color",rgb(188,95,26));
    }
});


onEvent("addIcon","click",function(){
    instance.newLabel("BackgroundEnchants",5,5,310,435,rgb(187,127,15,0.85),"");
    enchantElementList.push("BackgroundEnchants");
    var x_offset = 0;
    var y_offset = 0;
    var currentIcons = [];
    for (var i in enchants.equipped) {currentIcons.push(enchants.equipped[i])}
    for (var unequippedEnchant in enchants.unequipped) {
        enchantElementList.push(enchants.unequipped[unequippedEnchant]);
        instance.newImage(enchants.unequipped[unequippedEnchant], 10+(x_offset*80), 10+(y_offset*80), 75, 75, enchants.unequipped[unequippedEnchant]+".png");
        x_offset++;
        if (x_offset>2) {x_offset=0,y_offset++}
        function click(name){
            onEvent(name,"click",function(){
                deleteElement(name);
                enchantElementList.splice(enchantElementList.indexOf(name),1);
                enchants.unequipped.splice(enchants.unequipped.indexOf(name),1);
                enchants.equipped.push(name);
                enchants.update();
            });
        }
        click(enchants.unequipped[unequippedEnchant]);
    }
    instance.newButton("backTempEnchants",10,405,300,30,rgb(188,59,26),"back");
    enchantElementList.push("backTempEnchants");
    onEvent("backTempEnchants","click",function(){
        for (var enchant in currentIcons) {deleteElement("enchant_equipped_"+currentIcons[enchant])}
        for (var element in enchantElementList){deleteElement(enchantElementList[element]);}
        enchantElementList = [];
        enchants.show();
    });
});

onEvent("enchants","click",function(){playSound("Small_Click.mp3"),setScreen("Enchants"),enchants.show()});
onEvent("back2","click",function(){
    setScreen("Lobby");
    for (var enchant in enchants.equipped) {deleteElement("enchant_equipped_"+enchants.equipped[enchant])}
});

//STORY DIALOGUE ELEMENTS ------------------------////////////////////////////////////////////////-------------------------------
var externalDiaIndex = 0;
var shouldOverride = [null,null];

function handleStory(){
    if (section.split(">")[1] === "NextChapter"){
        chapter++;
        for (var storyPart in story["Ch"+chapter]) {if (storyPart.split(">")[0] == section.split(">")[2]){section = storyPart}}
    } else {
        for (var sectionPart in story["Ch"+chapter]) {
            if (sectionPart.split(">")[0] === section.split(">")[1]){
                section = sectionPart;
                return;
            }
        }
    }
}

function continueDialogue(override,path) {

    if (override && path) {
        if (!path[externalDiaIndex]) {
            externalDiaIndex = 0;
            shouldOverride = [null,null];
            setScreen("WorldMap");
        } else {
            dialogue(path[externalDiaIndex][0],path[externalDiaIndex][1],path[externalDiaIndex][2],path[externalDiaIndex][3]);
            externalDiaIndex += 1;
        }
        return;
    }

    if (SPart + 1 > story["Ch"+chapter][section].length-1){
        handleStory();
        setScreen("WorldMap");
        SPart = -1;
        return;
    } else {
        SPart++;
    }

    dialogue(story["Ch"+chapter][section][SPart][0] , story["Ch"+chapter][section][SPart][1] , story["Ch"+chapter][section][SPart][2] , story["Ch"+chapter][section][SPart][3] , true);
}

var Q_Handler = []; //dictionary of player answers; lasts for the current session
//Constructor class in this situation; constructor or class dont exist
function Question(name,Options) { //USE THE NEW CONSTRUCTOR TO CREATE; probably the most OOP function i have lol
    this.Options = Options;
    this.Answer = null; //will be updated when rendered

    this.Create = function(){ //visually create the buttons
        for (var q in Options) {
            instance.newButton("id"+q,80,75 + (q*40),180,30,rgb(191, 133, 75),Options[q]);

            function bind(qe) { //allow the different options to correspond to their answers
                onEvent("id"+qe,"click",function(){
                    playSound("Small_Click.mp3");
                    this.Answer = qe;
                    deleteElement("BLOCKERD");
                    insertItem(Q_Handler,Q_Handler.length, {QData : name, Choice : this.Answer});
                    for (var p in Options) {//rid the visuals
                        deleteElement("id"+p);
                    }
                    if (shouldOverride[0]) { //in case we are in dialogue, however this may get removed
                        continueDialogue(shouldOverride[0],shouldOverride[1]);
                    } else {
                        continueDialogue();
                    }
                });
            }
            bind(q);
        }
    };
}

var skip = false;
var allowedToSkip = false; //prevent spam clicking to skip multiple dialogues

function splitText(input){//we will split the text by each individual word, replicating real assembly UI
    var returnValue = [];
    var splitAll = input.split(" ");//this lets us split by word
    for (var textInst in splitAll){//we will format these into objects
        if (splitAll[textInst][0]==="<"){
            returnValue.push({normal: (splitAll[textInst].split(">")[1]), style: splitAll[textInst].split(">")[0].substring(1)});
        } else {
            returnValue.push({normal:(splitAll[textInst])});
        }
    }

    return returnValue;
}

var activeDialogueBoxes = [];
var currentOffset = {x:0,y:0};
function dialogue(speaker,text, check,voice,fromStory) {
    instance.newLabel("BLOCKERD",0,0,320,450,rgb(255,255,255,0),"");
    if (speaker.substring(0,2) == "/Q") {
        var newQ = new Question(speaker.substring(3,speaker.length),text); //use New for constructor functions (classes if it was ES6)
        newQ.Create(); //we need to actually initialize it
        return;
    } else if (speaker.substring(0,2) == "/B") {//battle trigger
        if (fromStory) {//unique speakers are only given towards the end of dialogues
            handleStory();
            SPart=-1;
        }
        instance.newLabel("DS_Transition",0,-450,320,450,rgb(0,0,0),"");
        setProperty("Bat_Transition","y",0);
        var t = new TweenService.create("DS_Transition",{y :0},1,'Sine','Out',60);
        t.play();
        setTimeout(function(){startBattle(text[0],text[1],text[2]),setProperty("DS_Transition","y",-450),deleteElement("DS_Transition"),deleteElement("BLOCKERD")},1200);
        return;
    } else if (speaker.substring(0,2) == "/W"){//go back to the world trigger
        setScreen("WorldMap");
        return;
    }

    instance.newLabel("DialogueBox",10,340,300,100,rgb(255,255,255),"");
    setProperty("DialogueBox","border-radius",10);
    instance.newLabel("Speaker",10,310,185,25,rgb(255,255,255),speaker,rgb(0,0,0));
    setProperty("Speaker","border-radius",10);

    if (check) {
        text = text[Q_Handler[0].Choice];
        Q_Handler.pop();
    }

    setText("Speaker",speaker);
    allowedToSkip = true;
    var log = "";

    var index = 0;
    var textIndex = 0;
    var allTexts = splitText(text);
    var readableText = "";
    for (var i = 0; i < allTexts.length; i++) {
        var x = 10 + currentOffset.x;
        var y = 340 + currentOffset.y;
        var textObj = allTexts[i];
        var textValue = textObj.normal;
        var labelWidth = textValue.length * 7; //7.2 is the character width, but we round down (lowered as it fits better, the actual is 7.6)

        if (currentOffset.x + labelWidth > 300) {
            x=10;
            currentOffset.x= labelWidth + 7;
            currentOffset.y += 16;
            y = 340 + currentOffset.y;
        } else {
            currentOffset.x += labelWidth + 7;
            textValue+= " ";
        }

        readableText+=textValue;
        instance.newLabel("dialogueText_" + i, x, y, labelWidth+8, 17, rgb(25,25,25,0), "",rgb(0,0,0));
        setStyle("dialogueText_"+i, "font-family: monospace; font-size: 13px");
        activeDialogueBoxes.push("dialogueText_"+i);
        if (allTexts[i].style) {setProperty("dialogueText_"+i,"text-color",allTexts[i].style)}
    }
    currentOffset = {x:0,y:0};

    instance.newLabel("InvisSkip",10,340,300,100,rgb(255,255,255,0),"");
    onEvent("InvisSkip", "click", function() {if (allowedToSkip) {skip = true}
        playSound("sound://category_objects/click.mp3")});

    function createNextButton(){
        instance.newButton("ContinueDialogue",230,305,80,30,rgb(188,143,26),"continue");
        onEvent("ContinueDialogue","click",function(){
            playSound("Small_Click.mp3");
            deleteElement("InvisSkip");
            deleteElement("Speaker");
            deleteElement("BLOCKERD");
            deleteElement("DialogueBox");
            for (var element in activeDialogueBoxes){deleteElement(activeDialogueBoxes[element])}
            activeDialogueBoxes = [];
            if (shouldOverride[0]) {
                continueDialogue(shouldOverride[0],shouldOverride[1]);
            } else {
                continueDialogue();
            }
            deleteElement("ContinueDialogue");

        });
    }
    // if (randomNumber(0,1) === 0){playSpeech(readableText,"male","English (UK)")} else {playSpeech(readableText,"female","English (UK)")}//TTS
    function typeNextChar() {
        if (skip && allowedToSkip) {
            skip = false;
            allowedToSkip = false;
            for (var i = 0; i < allTexts.length; i++) {setText("dialogueText_"+i,allTexts[i].normal)}
            createNextButton();
            return;
        }
        if (index >= allTexts[textIndex].normal.length) {
            index = 0;
            log = "";
            textIndex++;
        }
        if (textIndex > allTexts.length-1){
            createNextButton();
            allowedToSkip = false;
            return;
        }
        if (voice) {playSound(voice)} else {playSound("OO_Talk.mp3")}
        var char = allTexts[textIndex].normal[index];
        log += char;
        setText("dialogueText_"+textIndex, log);
        index++;

        var delay = 45;

        if (char === ".") delay = 800;
        else if (char === "?") delay = 700;
        else if (char === ",") delay = 600;
        else if (char === "!") delay = 800;

        setTimeout(typeNextChar, delay);
    }
    typeNextChar();
}

var HQMapData = [];
var HQIndex = 0;
var map = {
    HQ : false,
    renderedObjects : [],
    render : function(){
        setText("locationLabelMap","Location: "+location);
        setScreen("Map");
        if (map.HQ === true) {
            var areasNeeded = {};
            var area = location.split("_")[0];
            var anchor = "";
            for (var areas in world){
                if (anchor === "" && areas.split("_")[0] === location.split("_")[0]) {anchor = areas}
                if (areas.split("_")[0] === area) {
                    if (areas.includes("[")){continue}
                    areasNeeded[areas] = {};
                }
            }
            areasNeeded[anchor] = {x:0,y:0};

            function directionVector(dir){
                switch (dir) {
                    case "up":
                        return {x:0,y:1};
                    case "down":
                        return {x:0,y:-1};
                    case "left":
                        return {x:-1,y:0};
                    case "right":
                        return {x:1,y:0};
                }
            }
            function branchHQ(newLocation, oldLocVectors){
                for (var allDestinations in world[newLocation].Next){
                    var dirVec = directionVector(allDestinations);
                    if ((world[newLocation].Next[allDestinations]).split("_")[0] != area) {continue}
                    if (Object.keys(areasNeeded[world[newLocation].Next[allDestinations]]).length === 0){
                        areasNeeded[world[newLocation].Next[allDestinations]] = {x:dirVec.x + oldLocVectors.x,y:dirVec.y + oldLocVectors.y,tag:"B_"};
                        instance.newLabel("B_"+world[newLocation].Next[allDestinations],
                            135 + ((areasNeeded[world[newLocation].Next[allDestinations]].x*50)),
                            280 - (areasNeeded[world[newLocation].Next[allDestinations]].y * 70),
                            50,70, world[world[newLocation].Next[allDestinations]].Background,"");
                        map.renderedObjects.push("B_"+world[newLocation].Next[allDestinations]);

                        for (var object in world[world[newLocation].Next[allDestinations]].Areas){
                            if (world[world[newLocation].Next[allDestinations]].Areas[object].image === "|"){
                                var areaX = 135 + ((areasNeeded[world[newLocation].Next[allDestinations]].x*50));
                                var areaY = 280 - ((areasNeeded[world[newLocation].Next[allDestinations]].y*70));
                                var areaObj = world[world[newLocation].Next[allDestinations]].Areas[object];
                                instance.newLabel("++"+world[world[newLocation].Next[allDestinations]].Areas[object].id+HQIndex,
                                    areaX + (areaObj.x/6.25),
                                    areaY + (areaObj.y / 6.25),
                                    areaObj.width / 6.25,
                                    areaObj.height / 6.25,
                                    areaObj.color, ""
                                );
                            } else {
                                var areaX = 135 + ((areasNeeded[world[newLocation].Next[allDestinations]].x*50));
                                var areaY = 280 - ((areasNeeded[world[newLocation].Next[allDestinations]].y*70));
                                var areaObj = world[world[newLocation].Next[allDestinations]].Areas[object];
                                instance.newImage("++"+world[world[newLocation].Next[allDestinations]].Areas[object].id+HQIndex,
                                    areaX + (areaObj.x / 6.25),
                                    areaY + (areaObj.y / 6.25),
                                    areaObj.width / 6.25,
                                    areaObj.height / 6.25,
                                    world[world[newLocation].Next[allDestinations]].Areas[object].image ||"Nil.png"
                                );
                            }
                            HQMapData.push("++"+world[world[newLocation].Next[allDestinations]].Areas[object].id + HQIndex.toString());
                            HQIndex++;

                        }

                        if (Object.keys(world[world[newLocation].Next[allDestinations]]).length > 0){//setup the next branch
                            branchHQ(world[newLocation].Next[allDestinations], areasNeeded[world[newLocation].Next[allDestinations]]);
                        }
                    }
                }
            }
            instance.newLabel("D_"+anchor,135,280,50,70,world[anchor].Background,"");
            setProperty("D_"+anchor,"border-color","white");
            map.renderedObjects.push("D_"+anchor);
            areasNeeded[anchor].tag = "D_";
            for (var object in world[anchor].Areas){
                if (world[anchor].Areas[object].image === "|"){
                    var areaX = 135 + ((areasNeeded[anchor].x*50));
                    var areaY = 280 - ((areasNeeded[anchor].y*70));
                    var areaObj = world[anchor].Areas[object];
                    instance.newLabel("++"+world[anchor].Areas[object].id+HQIndex,
                        areaX + (areaObj.x/6.25),
                        areaY + (areaObj.y / 6.25),
                        areaObj.width / 6.25,
                        areaObj.height / 6.25,
                        areaObj.color, ""
                    );
                } else {
                    var areaX = 135 + ((areasNeeded[anchor].x*50));
                    var areaY = 280 - ((areasNeeded[anchor].y*70));
                    var areaObj = world[anchor].Areas[object];
                    instance.newImage("++"+world[anchor].Areas[object].id+HQIndex,
                        areaX + (areaObj.x / 6.25),
                        areaY + (areaObj.y / 6.25),
                        areaObj.width / 6.25,
                        areaObj.height / 6.25,
                        world[anchor].Areas[object].image ||"Nil.png"
                    );
                }
                HQMapData.push("++"+world[anchor].Areas[object].id + HQIndex.toString());
                HQIndex++;
            }

            for (var allDestinations in world[anchor].Next){
                if (world[world[anchor].Next[allDestinations]].Name.split("_")[0] != location.split("_")[0]){continue}
                var dirVec = directionVector(allDestinations);
                areasNeeded[world[anchor].Next[allDestinations]] = {x:dirVec.x,y:dirVec.y,tag:"D_"};

                instance.newLabel("D_"+world[anchor].Next[allDestinations],
                    135 + ((areasNeeded[world[anchor].Next[allDestinations]].x*50)),
                    280 - (areasNeeded[world[anchor].Next[allDestinations]].y * 70),
                    50,70, world[world[anchor].Next[allDestinations]].Background,"");
                map.renderedObjects.push("D_"+world[anchor].Next[allDestinations]);
                branchHQ(world[anchor].Next[allDestinations],areasNeeded[world[anchor].Next[allDestinations]]);
                for (var object in world[world[anchor].Next[allDestinations]].Areas){
                    if (world[world[anchor].Next[allDestinations]].Areas[object].image === "|"){
                        var areaX = 135 + ((areasNeeded[world[anchor].Next[allDestinations]].x*50));
                        var areaY = 280 - ((areasNeeded[world[anchor].Next[allDestinations]].y*70));
                        var areaObj = world[world[anchor].Next[allDestinations]].Areas[object];
                        instance.newLabel("++"+world[world[anchor].Next[allDestinations]].Areas[object].id+HQIndex,
                            areaX + (areaObj.x / 6.25),
                            areaY + areaObj.y / 6.25,
                            areaObj.width / 6.25,
                            areaObj.height / 6.25,
                            areaObj.color, ""
                        );
                    } else {
                        var areaX = 135 + ((areasNeeded[world[anchor].Next[allDestinations]].x*50));
                        var areaY = 280 - ((areasNeeded[world[anchor].Next[allDestinations]].y*70));
                        var areaObj = world[world[anchor].Next[allDestinations]].Areas[object];
                        instance.newImage("++"+world[world[anchor].Next[allDestinations]].Areas[object].id+HQIndex,
                            areaX + (areaObj.x / 6.25),
                            areaY + (areaObj.y / 6.25),
                            areaObj.width / 6.25,
                            areaObj.height / 6.25,
                            world[world[anchor].Next[allDestinations]].Areas[object].image ||"Nil.png"
                        );
                    }
                    HQMapData.push("++"+world[world[anchor].Next[allDestinations]].Areas[object].id+HQIndex.toString());
                    HQIndex++;

                }
            }
            for (var worldPart in areasNeeded) {
                if (worldPart === location) {
                    setProperty(areasNeeded[worldPart].tag+worldPart,"border-color","white");
                    setProperty(areasNeeded[worldPart].tag+worldPart,"border-width",2);
                }
            }

        } else { // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            var areasNeeded = {};
            var area = location.split("_")[0];
            var anchor = "";
            for (var areas in world){
                if (anchor ===""&& areas.split("_")[0] === location.split("_")[0]) {anchor = areas}
                if (areas.split("_")[0] === area) {
                    if (areas.includes("[")){continue}
                    areasNeeded[areas] = {}
                }
            }
            areasNeeded[anchor] = {x:0,y:0};

            function directionVector(dir){
                switch (dir) {
                    case "up":
                        return {x:0,y:1};
                    case "down":
                        return {x:0,y:-1};
                    case "left":
                        return {x:-1,y:0};
                    case "right":
                        return {x:1,y:0};
                }
            }
            function branch(newLocation, oldLocVectors){
                for (var allDestinations in world[newLocation].Next){
                    var dirVec = directionVector(allDestinations);
                    if ((world[newLocation].Next[allDestinations]).split("_")[0] != area) {continue}
                    if (Object.keys(areasNeeded[world[newLocation].Next[allDestinations]]).length === 0){
                        areasNeeded[world[newLocation].Next[allDestinations]] = {x:dirVec.x + oldLocVectors.x, y:dirVec.y + oldLocVectors.y, tag:"B_"};
                        instance.newLabel("B_"+world[newLocation].Next[allDestinations],
                            135 + ((areasNeeded[world[newLocation].Next[allDestinations]].x * 50)),
                            310 - (areasNeeded[world[newLocation].Next[allDestinations]].y * 40),
                            50,40, world[world[newLocation].Next[allDestinations]].Background,"");
                        map.renderedObjects.push("B_"+world[newLocation].Next[allDestinations]);
                        if (Object.keys(world[world[newLocation].Next[allDestinations]]).length > 0){//setup the next branch
                            branch(world[newLocation].Next[allDestinations], areasNeeded[world[newLocation].Next[allDestinations]]);
                        }
                    }
                }
            }
            instance.newLabel("D_"+anchor,135,310,50,40,world[anchor].Background,"");
            setProperty("D_"+anchor,"border-color","white");
            map.renderedObjects.push("D_"+anchor);
            areasNeeded[anchor].tag = "D_";

            for (var allDestinations in world[anchor].Next){
                if (world[world[anchor].Next[allDestinations]].Name.split("_")[0] != location.split("_")[0]){continue}
                var dirVec = directionVector(allDestinations);
                areasNeeded[world[anchor].Next[allDestinations]] = {x:dirVec.x, y:dirVec.y, tag:"D_"};
                instance.newLabel("D_"+world[anchor].Next[allDestinations],
                    135 + ((areasNeeded[world[anchor].Next[allDestinations]].x * 50)),
                    310 - (areasNeeded[world[anchor].Next[allDestinations]].y * 40),
                    50,40, world[world[anchor].Next[allDestinations]].Background,"");
                map.renderedObjects.push("D_"+world[anchor].Next[allDestinations]);
                branch(world[anchor].Next[allDestinations],areasNeeded[world[anchor].Next[allDestinations]]);
            }
            for (var worldPart in areasNeeded) {
                if (worldPart === location) {
                    setProperty(areasNeeded[worldPart].tag + worldPart,"border-color","white");
                    setProperty(areasNeeded[worldPart].tag + worldPart,"border-width",2);
                }
            }
        }
    },
};

onEvent("mapSettingCheck","change",function(){
    playSound("Small_Click.mp3");
    if (getChecked("mapSettingCheck") === true) {map.HQ = true} else {map.HQ = false}
});

onEvent("mapButton","click",function(){playSound("Small_Click.mp3"),map.render()});
onEvent("back6","click",function(){
    for (var e in map.renderedObjects){deleteElement(map.renderedObjects[e])}
    for (var el in HQMapData){deleteElement(HQMapData[el])}
    HQMapData = [];
    map.renderedObjects = [];
    setScreen("Lobby");
});

var currentSceneElements = [];

function createDestination(scene,dir){
    var ranName = 1;
    var documents = [];
    instance.newLabel("BLOCKER",0,0,320,450,rgb(255,255,255,0),"");

    for (var element in currentSceneElements) {
        var e = currentSceneElements[element];
        var tween = dir == "up" && new TweenService.create(e,{y: getProperty(e,"y") + 450},0.6,'Sine','In',60) || dir == "down" && new TweenService.create(e,{y: getProperty(e,"y") - 450},0.6,'Sine','In',60) || dir == "left" && new TweenService.create(e,{x: getProperty(e,"x") + 320},0.6,'Sine','In',60) || dir == "right" && new TweenService.create(e,{x: getProperty(e,"x") - 320},0.6,'Sine','In',60);
        tween.play();
    }

    setTimeout(function(){
        var x_o = (dir == "left" && -320 || dir == "right" && 320 || 0);
        var y_o = (dir == "up" && 450 || dir == "down" && -450 || 0);

        for (var elements in scene.Areas) {
            documents.push("TransitionFrame"+ranName);
            image("TransitionFrame"+ranName ,scene.Areas[elements].image || "Nil.png");
            setPosition(scene.Areas[elements].id,scene.Areas[elements].x+ x_o,scene.Areas[elements].y + y_o ,scene.Areas[elements].width,scene.Areas[elements].height);
            actionBuilder(scene.Areas[elements].action,scene.Areas[elements]);
            ranName++;
        }

        for (var doc in documents) {
            var arrow = documents[doc];
            var sceneAnim = dir == "up" && new TweenService.create(arrow,{y: getProperty(arrow,"y") - 450},0.3,'Sine','In',60) || dir == "down" && new TweenService.create(arrow,{y: getProperty(arrow,"y") + 450},0.3,'Sine','In',60) || dir == "left" && new TweenService.create(arrow,{x: getProperty(arrow,"x") + 320},0.3,'Sine','In',60) || dir == "right" && new TweenService.create(arrow,{x: getProperty(arrow,"x") - 320},0.3,'Sine','In',60);
            sceneAnim.play();
        }
    },650);

    setTimeout(function(){
        for (var index = 0; index < currentSceneElements.length; index++){deleteElement(currentSceneElements[index])}
    },650);

    setTimeout(function(){
        currentSceneElements = [];
        for (var doc in documents) {deleteElement(documents[doc]);}
        deleteElement("BLOCKER");
        sceneBuilder(world[scene]);
    },1000);
}

function actionBuilder(action,obj,required){
    if (action && action === "goto") {
        onEvent(obj.id,"click",function(){
            for (var index = 0; index < currentSceneElements.length; index++){deleteElement(currentSceneElements[index])}
            location = obj.location;
            sceneBuilder(world[obj.location]);
        });
    } else if (required && action == "requiredDialogue") {
        onEvent(obj.id,"click",function(){
            if (obj.data) {internalData.push(obj.data)}
            shouldOverride = [true,obj.requiredDialogue];
            continueDialogue(true, obj.requiredDialogue);
        });
    } else if (action && action === "dialogue") {
        onEvent(obj.id,"click",function(){
            if (obj.data) {internalData.push(obj.data)}
            shouldOverride = [true,obj.dialogue];
            continueDialogue(true, obj.dialogue);
        });
    }else if (action && action ==="cutscene"){
        onEvent(obj.id,"click",function(){
            if (obj.data) {internalData.push(obj.data)}
            shouldOverride = [null,null];
            continueDialogue(false);
        });
    } else if (action && action === "shop"){
        onEvent(obj.id,"click",function(){
            shop.view(obj.shop[1],obj.shop[2]);
            shop.update(obj.shop[0]);
        });
    }
}

function sceneBuilder(scene) {
    currentSceneElements = [];
    setScreen("WorldMap");
    if (curSong != scene.Music){
        stopSound(curSong);
        curSong = scene.Music;
        playSound(scene.Music,true);
    }
    var hiddenList = [];
    if (scene.Events) {
        for (var event in scene.Events){
            if (scene.Events[event].action === "goto") {
                for (var data in internalData) {
                    if (internalData[data] === event) {
                        sceneBuilder(world[scene.Events[event].goto]);
                        return;
                    }
                }
                continue;
            } else if (scene.Events[event].action === 'hide') {
                for (var data in internalData) {
                    if (internalData[data] == event) {
                        hiddenList.push(scene.Events[event].hide);
                        console.log("hiding object");
                    }
                }
                continue;
            }
        }
    }
    var bareBgValues = stripRGBValues(scene.Background);
    var bgShift = new gradientTransform(null,{red:bareBgValues.red ,green:bareBgValues.green ,blue:bareBgValues.blue},"WorldMap",500);

    for (var elements in scene.Areas) {
        var skip = false;
        for (var ex in hiddenList) {if (scene.Areas[elements].id == hiddenList[ex]){skip=true;
            continue}}
        if (skip) {continue}
        var requirement = false;
        currentSceneElements.push(scene.Areas[elements].id);
        if (scene.Areas[elements].image == "|") {
            instance.newLabel(scene.Areas[elements].id,scene.Areas[elements].x,scene.Areas[elements].y,scene.Areas[elements].width,scene.Areas[elements].height,scene.Areas[elements].color,"");
        } else {
            instance.newImage(scene.Areas[elements].id,0,0,0,0,scene.Areas[elements].image || "Nil.png");
        }
        setPosition(scene.Areas[elements].id,scene.Areas[elements].x,scene.Areas[elements].y,scene.Areas[elements].width,scene.Areas[elements].height);
        if (scene.Areas[elements].storyEvent != null) {
            var splitE = scene.Areas[elements].storyEvent.split("/");
            if (splitE[0] == "Ch"+chapter && splitE[1] == section) {
                console.log("requirements met!")
            } else {
                requirement=true;
                hideElement(scene.Areas[elements].id);
            }
        }
        if (scene.Areas[elements].requiredEvent != null){
            for (var event in internalData){if (internalData[event] === scene.Areas[elements].requiredEvent){actionBuilder(scene.Areas[elements].requiredAction,scene.Areas[elements],true),requirement = true}}//loop through the player's events and find if they meet a satisfied event
        }
        if (!requirement) {actionBuilder(scene.Areas[elements].action,scene.Areas[elements])}
    }

    for (var dir in scene.Next) {
        if (!scene.Next[dir]){break}
        image(dir,"icon://fa-long-arrow-"+dir);
        setPosition(dir,
            dir == "left" && 5 || dir == "right" && 265 || 135,
            dir == "up" && 10  || dir == "down" && 390 || 200,
            50,
            50
        );
        setProperty(dir,"border-width",3);
        setProperty(dir,"border-radius",10);
        currentSceneElements.push(dir);
        function detatcher(dr){onEvent(dr,"click",function(){playSound("sound://category_movement/footstep_on_rock_or_ice_with_debris_2.mp3"),createDestination(scene.Next[dr],dr),location=scene.Next[dr]})}
        detatcher(dir);
    }
}

/*
Using InternalObjects gathered from the player's data, this can be used to specifically trigger events
or set objectives by making objects unviewable if already fought or interacted with, so InternalData may get very messy
*/

var world = { //open world loader; may need to give device time to load; I tried to make this as clean as possible
    "Woodrock_South_Enterance" : {//you should name a location: parentName_subsection because the parentName is used to find area-based songs and backgrounds
        Name: "Woodrock_South_Enterance",
        Background : "rgb(109,173,60)", //make sure Areas are rendered from lowest depth to highest! works like a draw order!
        Areas : [
            {id: "Building_A3",image : "building_A.png",x: 0,y:-20,width: 100, height: 200, action: null},
            {id: "Building_B3",image : "building_A.png",x: 220,y:-20,width: 100, height: 200, action: null},
            {id: "PathVertical",image:"|",x:125,y:0,width:80,height:290,action: null,color: rgb(241,223,117)},
            {id: "PathHorizontal",image:"|",x:0,y:250,width:340,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal2",image:"|",x:0,y:300,width:340,height:5,action: null, color: rgb(201,169,87)},
            {id: "tree9",image:"tree.png",x:60,y:0,width:100,height:100,action: null},
            {id: "tree10",image:"tree.png",x:160,y:0,width:100,height:100,action: null},
            {id: "tree7",image:"tree.png",x:60,y:40,width:100,height:100,action: null},
            {id: "tree8",image:"tree.png",x:160,y:40,width:100,height:100,action: null},
            {id: "tree1",image:"tree.png",x:60,y:80,width:100,height:100,action: null},
            {id: "tree2",image:"tree.png",x:160,y:80,width:100,height:100,action: null},
            {id: "Building_A2",image : "building_A.png",x: 0,y:20,width: 100, height: 200, action: null},
            {id: "Building_B2",image : "building_A.png",x: 220,y:20,width: 100, height: 200, action: null},
            {id: "tree3",image:"tree.png",x:60,y:120,width:100,height:100,action: null},
            {id: "tree4",image:"tree.png",x:160,y:120,width:100,height:100,action: null},
            {id: "Building_A1",image : "building_A.png",x: 0,y:60,width: 100, height: 200, action: null},
            {id: "Building_B1",image : "building_A.png",x: 220,y:60,width: 100, height: 200, action: null},
            {id: "tree5",image:"tree.png",x:60,y:160,width:100,height:100,action: null},
            {id: "tree6",image:"tree.png",x:160,y:160,width:100,height:100,action: null},
            {id: "lamp1",image:"lamp.png",x:0,  y:330,width:100,height:100,action: null},
            {id: "lamp2",image:"lamp.png",x:250,y:330,width:100,height:100,action: null},
            {id: "hole", image:"|",x:75,y:305,width:50,height:30,action:null,color:rgb(115,80,20)},
            {id: "child1",image:"aura_man.png", x: 175, y: 275, width: 50, height: 50, action: "dialogue", dialogue : [["small child","Wooaaah, the <rgb(178,61,239)>STAFF can do <rgb(215,0,0)>DoT <rgb(215,0,0)>dmg!"], [player.Name,"Um, what?"], ["Child", "It means it can apply <rgb(215,0,0)>fire <rgb(215,0,0)>dmg, which deals damage even if the enemy has <rgb(0,0,200)>defense!"]]},
            {id: "Blacksmith",image:"Man_Silhouette.png", x: 200, y :350, width: 50, height: 50, action: "dialogue", dialogue : [["Blacksmith","You looking for <rgb(255,0,0)>weapons? Sorry we've got a shortage right now",,"king.mp3"],["Blacksmith", "Be sure to come back later!"],,"king.mp3"], requiredEvent:"BlackSmithDone", requiredAction : "shop"},
            {id: "oldguy",image:"Man_Silhouette.png", x: 70, y: 200, width: 50, height: 50, action: "dialogue", dialogue : [["Old man","Hey, you know you can equip more moves right?",,"Male_3.mp3"], ["Old man","Go to your <rgb(150,0,150)>enchants and find the ones you want, watch out for the ones that cost <rgb(166,111,16)>CRG, just keep in mind you can only equip up to <rgb(255,0,0)>6 moves.",,"Male_3.mp3"]] },
            {id: "man1",image:"man.png", x: 20, y: 275, width: 50, height:50, action: "dialogue", dialogue : [["Suspicious citizen","Those... Burgers...",,"Male_2.mp3"],["Suspicious citizen", "Gaaah! You didn't hear <rgb(255,0,0)>ANYTHING!",,"Male_2.mp3"], [player.Name, "What burgers? I've been hearing all about them!"], ["Suspicious citizen", "What? You don't know about the <rgb(166,111,16)>legendary <rgb(166,111,16)>burgers? All you need to know here is that the <rgb(59,166,16)>Lilypad's location is known, but why should I tell you? You look more capable than me!",,"Male_2.mp3"],[player.Name,"Oh, thanks I guess? Would you please give me where to go?"],["Suspicious citizen","No",,"Male_2.mp3"]]},
            {id: "buffMan",image:"man.png", x: 75, y: 275, width: 50, height: 50, action: "dialogue", dialogue : [["Buff guy", "Hey, you think you could lend me a hand here? I'm kind of stuck here",,"Male_1.mp3"],["/Q~buff-guy", ["Sure!", "Walk away"]],["Buff guy", ["Aargh, even you and that other person can't help me out? Maybe I need to lose some weight...","What?! Don't walk away! Please! I'll pay you to get me out of this hole!"],"buff-guy","Male_1.mp3"]]},
            {id: "BattleGuy",image:"angryMan.png", x: 80, y: 375, width: 50, height: 50, action: "dialogue", dialogue : [["man","Yo you wanna pick a <rgb(255,0,0)>fight with me bruv?"],["/B",[[enemies.Dummy,enemies.Spiker1,enemies.Spiker1],[player, characters.MG_Tut]]]], requiredEvent:"WarDiscount", requiredAction:"requiredDialogue", requiredDialogue: [["Guy","Woah woah dude, we already fought"]]}
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {up : "Woodrock_Plaza",left: "Woodrock_Street_1",right:"Woodrock_Street_2"}
    },
    "Woodrock_Street_1":{
        Name: "Woodrock_Street_1",
        Background : 'rgb(109,173,60)',
        Areas : [
            {id: "PathVertical", image: "|", x:200,y:0,width:70,height:290,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal",image:"|",x:200,y:240,width:120,height:50,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal2",image:"|",x:200,y:290,width:120,height:5,action:null,color: rgb(201,169,87)},
            {id: "tree0",image:"tree.png",x:250,y:0,width:100,height:100,action: null},
            {id: "tree1",image:"tree.png",x:250,y:60,width:100,height:100,action: null},
            {id: "tree2",image:"tree.png",x:250,y:120,width:100,height:100,action: null},
            {id:"DirtTop",image:"|",x:0,y:350,width:320,height:80,action:null,color:rgb(115,80,20)},
            {id:"DirtBottom",image:"|",x:0,y:380,width:320,height:50,action:null,color:rgb(82,55,9)},
            {id:"DirtSide",image:"|",x:300,y:350,width:20,height:80,action:null,color:rgb(115,80,20)},
            {id:"StoneWall", image:"|",x:0,y:0,width:30,height:350,action:null,color:rgb(73,74,82)},
            {id: "House2", image: "building_A.png", x: 50,y:0, width : 100, height: 200, action : null},
            {id: "lamp2",image:"lamp.png",x:130,  y:50,width:100,height:100,action: null},
            {id: "lamp1",image:"lamp.png",x:130,  y:100,width:100,height:100,action: null},
            {id: "House", image: "building_A.png", x: 50,y:70, width : 100, height: 200, action : null},
            {id: "cube", image:"tungsten.png", x:120,y:240,width:50,height:50,action:"dialogue",dialogue:[["","The tungsten cube looks at you menacingly. Or you might just be hallucinating"],["","The cube <rgb(166,111,16)>moved! It's rolling in hot for an ambush! "],["/B", [[enemies.Tungsten_cube],[player],"Tungsten-cube.mp3"]]]},
            {id: "stuck_man",image:"man.png", x: 100, y: 350, width: 50, height: 50, action: "dialogue", dialogue : [["guy","I might be stuck in this hole"],["guy","stuck with <rgb(255,0,0)>HIM..."],["guy","He's ben eyeing that cave down there and I don't like it"]]},
            {id: "sad-man", image:"sadFace.png", x:50,y:380, width: 50, height: 50, action: "dialogue", dialogue: [["sad man","It came..."],["sad man","out...."]]}
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {right: "Woodrock_South_Enterance",up:"Woodrock_Road_1"},
    },
    "Woodrock_Street_2":{
        Name: "Woodrock_Street_2",
        Background : 'rgb(132,173,60)',
        Areas : [
            {id: "PathVertical", image: "|", x:190,y:0,width:40,height:100,action:null,color: rgb(241,223,117)},
            {id: "PathVertical2", image: "|", x:60,y:100,width:40,height:180,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal",image:"|",x:0,y:240,width:60,height:50,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontalShadow",image:"|",x:0,y:280,width:100,height:5,action:null,color: rgb(201,169,87)},
            {id:"PathHorizontal2",image:"|",x:60,y:100,width:170,height:40,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal3",image:"|",x:100,y:140,width:130,height:5,action:null,color: rgb(201,169,87)},
            {id: "tree0",image:"tree.png",x:250,y:0,width:100,height:100,action: null},
            {id: "tree1",image:"tree.png",x:250,y:60,width:100,height:100,action: null},
            {id: "tree2",image:"tree.png",x:250,y:120,width:100,height:100,action: null},
            {id: "tree3",image:"tree.png",x:250,y:320,width:100,height:100,action: null},
            {id: "tree4",image:"tree.png",x:-20,y:240,width:100,height:100,action: null},
            {id: "tree5",image:"tree.png",x:-20,y:320,width:100,height:100,action: null},
            {id: "tree7",image:"tree.png",x:-20,y:-20,width:100,height:100,action: null},
            {id: "tree8",image:"tree.png",x:60,y:-20,width:100,height:100,action: null},
            {id: "lamp2",image:"lamp.png",x:-10,  y:50,width:100,height:100,action: null},
            {id: "lamp1",image:"lamp.png",x:80,  y:100,width:100,height:100,action: null},
            {id: "tree9",image:"tree.png",x:-20,y:150,width:100,height:100,action: null},
            {id: "tree6",image:"tree.png",x:80,y:160,width:100,height:100,action: null},
            {id: "lost_man",image:"man.png", x: 100, y: 350, width: 50, height: 50, action: "dialogue", dialogue : [["guy","I followed some old map I found to try and find the <rgb(0,180,0)>swamp"],["guy","I don't have a clue on how I ended up at... Woodrock?"]]},
            {id: "dog",image:"dog.png",x:225,y:250,width:50,height:50,action:"dialogue",dialogue:[["dog","I was told to catch this wooden ball, because y'know? Tennis balls weren't invented in the medieval times?"],["dog","also <rgb(255,0,0)>nobody will believe you if I told you I was secretly a time traveler in disguise as a dog"]]},
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {left: "Woodrock_South_Enterance",up:"Woodrock_Bank"},
    },
    "Woodrock_Road_1":{
        Name: "Woodrock_Road_1",
        Background : 'rgb(109,173,60)',
        Areas : [
            {id: "PathVertical", image: "|", x:200,y:0,width:70,height:430,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal",image:"|",x:200,y:200,width:120,height:50,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal2",image:"|",x:270,y:250,width:50,height:5,action:null,color: rgb(201,169,87)},
            {id: "tree0",image:"tree.png",x:250,y:0,width:100,height:100,action: null},
            {id: "tree1",image:"tree.png",x:250,y:50,width:100,height:100,action: null},
            {id: "tree2",image:"tree.png",x:250,y:100,width:100,height:100,action: null},
            {id: "tree3",image:"tree.png",x:250,y:250,width:100,height:100,action: null},
            {id: "tree4",image:"tree.png",x:250,y:300,width:100,height:100,action: null},
            {id: "tree5",image:"tree.png",x:250,y:350,width:100,height:100,action: null},
            {id:"StoneWall", image:"|",x:0,y:0,width:30,height:350,action:null,color:rgb(73,74,82)},
            {id: "House2", image: "building-2.png", x: 50,y:0, width : 100, height: 200, action : null},
            {id: "lamp2",image:"lamp.png",x:130,  y:50,width:100,height:100,action: null},
            {id: "lamp1",image:"lamp.png",x:130,  y:100,width:100,height:100,action: null},
            {id: "House", image: "building-3.png", x: 50,y:70, width : 100, height: 200, action : null},
            {id: "angry_man", image:"aura_man.png", x:120,y:240,width:50,height:50,action:"dialogue",dialogue: [["sulking man", "Dude! I keep losing these fights I get into!"],["sulking man","My opponent always uses <rgb(166,111,16)>items, but I think I don't need them to win. But I guess they can be <rgb(166,111,16)>helpful"]]},
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {right: "Woodrock_Plaza",down:"Woodrock_Street_1",up:"Woodrock_Road_2"},
    },
    "Woodrock_Plaza" : {
        Name : "Woodrock_Plaza",
        Background : "rgb(111,173,60)",
        Areas : [
            {id: "PathHorizontal",image:"|",x:0,y:200,width:340,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal2",image:"|",x:0,y:250,width:340,height:5,action: null, color: rgb(201,169,87)},
            {id: "PathVertical",image:"|",x:125,y:0,width:80,height:430,action: null,color: rgb(241,223,117)},
            {id: "house",image : "pngtree-house-with-no-background-png-image_9197435.png",x: 220,y:50,width: 100, height: 200, action: null},
            {id: "child1",image: "man2.png", x: 65, y: 265, width: 50, height: 50, action: "dialogue", dialogue : [["small child","My mom told me that attacks that use CRG deal more damage!",,"Male_2.mp3"], [player.Name,"But if you run out what do you do next?"], ["Woman", "Hey! Get back here Sr. Cane!",,"Female_2.mp3"],["Small Child","Gotta blast!",,"Male_2.mp3"]]},
            {id : "Trader",image: "shop.png", x: 0, y :50, width: 100, height: 100, action: "shop", shop : [["mango","funyuns","rock","nutella","sugar_apple"],"ooooo.mp3","man.png"]},
            {id: "oldguy",image: "man.png", x: 210, y: 280, width: 50, height: 50, action: "dialogue", dialogue : [["Old man","Back in my day, we used the BOW!"], ["Old man","But all these new guys have defense..."]]},
            {id: "pond", image:"pond.png",x: 210, y:300,width:100,height:100,action:null},
            {id:"woman2",image:"woman.png",x:250,y:360,width:50,height:50,action:"dialogue",dialogue: [["woman","I've always thought about how fish live in this world",,"Female_1.mp3"],["woman","Hm? Oh I'm just dozing off.",,"Female_1.mp3"]]},
            {id: "man1", image:"woman.png", x: 220, y: 215, width: 50, height:50, action: "dialogue", dialogue : [["Lady Agag","Someone told me ill be famous one day",,"Female_3.mp3"],["Lady Agag","Im thinking about pursuing a musical career!",,"Female_3.mp3"]]},
            {id: "man2",image:"man2.png", x: 75, y: 105, width: 50, height: 50, action: "dialogue", dialogue : [["Bob","<rgb(255,0,0)>I. <rgb(255,0,0)>AM. <rgb(255,0,0)>NOT. <rgb(255,0,0)>A. <rgb(255,0,0)>BUILDER!!!"]]},
            {id: "STORYMAN",image: "Man_Silhouette.png", x:150,y:75,width:50,height:50,action:"cutscene", storyEvent : "Ch1/Intro>Grassfield_1",data:"shopUnlock"},//if they are not on that scene, then dont show this event
            {id: "BattleGuy",image:"Light_Woodrock_A.png", x: 80, y: 375, width: 50, height: 50, action: "dialogue", dialogue : [["/B",[[enemies.Uranium_232],[player]]]] },
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {down: "Woodrock_South_Enterance",up: "Woodrock_Well",left:"Woodrock_Road_1",right:"Woodrock_Bank"} //where the arrows go to
    },
    "Woodrock_Bank":{
        Name : "Woodrock_Bank",
        Background : "rgb(56,214,82)",
        Areas : [
            {id: "PathVertical1",image:"|",x:80,y:0,width:40,height:100,action: null,color: rgb(241,223,117)},
            {id: "PathHorizontal1",image:"|",x:0,y:200,width:40,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal1_shadow",image:"|",x:0,y:250,width:40,height:5,action: null, color: rgb(201,169,87)},
            {id: "PathHorizontal2",image:"|",x:280,y:200,width:40,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal2_shadow",image:"|",x:280,y:250,width:40,height:5,action: null, color: rgb(201,169,87)},
            {id: "PathHorizontal3",image:"|",x:40,y:100,width:240,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal3_shadow",image:"|",x:40,y:150,width:240,height:5,action: null, color: rgb(201,169,87)},
            {id: "PathHorizontal4",image:"|",x:40,y:300,width:250,height:50,action: null, color: rgb(241,223,117)},
            {id: "PathHorizontal4_shadow",image:"|",x:40,y:350,width:250,height:5,action: null, color: rgb(201,169,87)},
            {id: "PathVertical2",image:"|",x:40,y:100,width:50,height:200,action: null, color: rgb(241,223,117)},
            {id: "PathVertical3",image:"|",x:240,y:100,width:50,height:200,action: null, color: rgb(241,223,117)},
            {id: "PathVertical4",image:"|",x:180,y:350,width:40,height:80,action: null,color: rgb(241,223,117)},
            {id: "tree1",image:"tree.png",x:25,y:60,width:100,height:100,action: null},
            {id: "tree5",image:"tree.png",x:-25,y:-50,width:100,height:100,action: null},
            {id: "tree4",image:"tree.png",x:-25,y:0,width:100,height:100,action: null},
            {id: "tree3",image:"tree.png",x:-25,y:50,width:100,height:100,action: null},
            {id: "tree2",image:"tree.png",x:-25,y:100,width:100,height:100,action: null},
            {id: "tree6",image:"tree.png",x:-25,y:250,width:100,height:100,action: null},
            {id: "tree7",image:"tree.png",x:-25,y:300,width:100,height:100,action: null},
            {id: "tree8",image:"tree.png",x:-25,y:350,width:100,height:100,action: null},
            {id: "tree9",image:"tree.png",x:190,y:340,width:100,height:100,action: null},
            {id: "tree10",image:"tree.png",x:260,y:340,width:100,height:100,action: null},
            {id: "man", image:"man2.png",x:30,y:150,width:50,height:50,action:"dialogue",dialogue: [["angry citizen","Dude, did they really not have enough tax money to get rid of this tree on the sidewalk?"],["angry citizen","I pay my taxes for what?!"],["angry citizen","Clearly it doesn't go to making Woodrock a better place!"]]},
            {id: "woman", image:"woman.png",x:70,y:350,width:50,height:50,action:"dialogue",dialogue: [["calm woman","What a lovely day to picnic out here!"],["calm woman","Have you seen that man up North? He looks quite <rgb(255,0,0)>distressed..."],["calm woman","Oh right, I shouldn't be plugging my nose into anyone's <rgb(0,0,255)>business, and so should <rgb(150,150,0)>you. Say... You want a burger?"],["","she drops the burger"],["calm woman","oops, sorry!"]]},
            {id: "Bank",image : "bank.png",x: 70,y:90,width: 200, height: 200, action: null},
            {id: "library", image: "library.png",x:200,y:-10,width:100,height:100,action:"goto",location:"Library_Woodrock"},
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {left:"Woodrock_Plaza",down:"Woodrock_Street_2"}
    },
    "Woodrock_Road_2" : {
        Name: "Woodrock_Road_2",
        Background: "rgb(91,161,42)",
        Areas: [
            {id: "namer", image:"man.png",x:200,y:100,width:50,height:50,action:null},
            {id:"tree",image:"tree.png",x:50,y:300,width:100,height:100,action:null},
            {id:"tree2",image:"tree.png",x:100,y:300,width:100,height:100,action:null},
            {id: "PathVertical", image: "|", x:200,y:200,width:70,height:230,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal",image:"|",x:200,y:200,width:120,height:50,action:null,color: rgb(241,223,117)},
            {id:"PathHorizontal2",image:"|",x:270,y:250,width:50,height:5,action:null,color: rgb(201,169,87)},
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {down:"Woodrock_Road_1"},
        Events: {}
    },
    "Woodrock_Well" : {
        Name: "Woodrock_Well",
        Background: "rgb(91,161,42)",
        Areas: [
            {id: "PathVertical",image:"|",x:125,y:250,width:80,height:180,action: null,color: rgb(241,223,117)},
            {id: "Well",image:"well_a.png", x:110,y:120,width:120,height:120,action:"dialogue",dialogue:[["","It's a well, throw a coin into it?"],["/Q~well", ["Throw a coin", "Leave it alone"]],["", ["You hear the coin ricochet as it spirals toward the bottom of the well. You hope for some good luck out of it.","Nothing eventful happens as you walk away"],"well"]]},
            {id:"man",image:"man.png",x:80,y:260,width:50,height:50,action:"dialogue",dialogue:[["guy","I heard that well over there grants <rgb(72,32,145)>wishes to those who are deemed as worthy of it!"],["guy","Maybe you should throw a <rgb(194,178,10)>coin and give it a try! I haven't had much luck unfortunately..."]]},
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {down:"Woodrock_Plaza",up:"Woodrock_Park"},
        Events: { //EVENTS NEED TO HAVE ONE GOTO ONLY, OTHER GOTOS AFTER THE FIRST WILL BE IGNORED
            KnightBeat: {action: "goto", goto: "Woodrock_Well[night]"},
        }
    },
    "Woodrock_Well[night]" : {
        Name: "Woodrock_Well[night]",
        Background: "rgb(82,119,196)",
        Areas: [
            {id: "fell", x:140,y:120,width:30,height:30},
            {id:"wall",image: "Man_Silhouette.png", x:50,y:50,width:50,height:50,action:"dialogue",dialogue:[["man","Im in your walls"]]}
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {down:"Woodrock_Plaza",up:"Woodrock_Park"},
    },
    "Woodrock_Park": {
        Name: "Woodrock_Park",
        Background: "rgb(32,179,98)",
        Areas: [
            {id: "pel", x:100,y:80,width:30,height:30},
            {id:"wall",image: "Man_Silhouette.png", x:100,y:250,width:50,height:50,action:"dialogue",dialogue:[["man","Im in your walls"]]}
        ],
        Music: "The_sky_of_woodrock.mp3",
        Next: {down:"Woodrock_Well",up:"Grasslands_1"},
    },
    "Library_Woodrock" : {
        Name: "Library_Woodrock",
        Background: "rgb(133,81,32)",
        Areas: [
            {id: "wall",image:"|", x:100,y:0,width:220,height:80, color: rgb(145,60,10)},
            {id: "receptionist",image: "woman2.png", x:250,y:200,width:50,height:50,action:"dialogue",dialogue:[["receptionist","Hi there! Welcome to the <rgb(145,60,10)>WOODROCK <rgb(145,60,10)>LIBRARY!"],["receptionist","we're currently undergoing upper floor renovations, so please stay on the <rgb(145,60,10)>ground floor for now!"],["receptionist","There's still plenty of books, so happy reading!"]]},

        ],
        Music: "eden.mp3",
        Next: {down:"Woodrock_Bank"},
    },
    "Grasslands_1":{
        Name: "Grasslands_1",
        Background: "rgb(149,245,66)",
        Areas: [
            {id: "fell", x:140,y:120,width:30,height:30},
            {id:"wall",image: "Man_Silhouette.png", x:50,y:50,width:50,height:50,action:"dialogue",dialogue:[["man","Im in your walls"]]},
            {id: "STORYMAN", x:150,y:75,width:50,height:50,action:"cutscene", storyEvent : "Ch1/Grassfield_1>Grassfield_2"},
        ],
        Music: "Plains.mp3",
        Next: {down:"Woodrock_Park"},
    },
};

var story = {
    "Ch1" : {
        "Intro>Grassfield_1" : [
            ["citizen", "What's that guy doing?"],
            ["???", "I am an evil man, I have come to bring havoc to your city"],
            ["citizen", "oh no someone stop him from being an evil guy"],
            ["citizen","Why are you being sarcastic? Our city could be destroyed if we dont stop him!"],
            ["???", "Ok, you there! in the crowd! "+player.Name+"! I need to see if my minions can do well against you!"],
            [player.Name, "wait what. I just got here"],
            ["/B",[[enemies.Grass_Dweller,enemies.Grass_Dweller],[player]]],
        ],
        "Grassfield_1>Grassfield_2" : [
            ["???","Look at this beauty of a machine!"],
            ["/Q~Ch1-2-2",["Not if I have anything to do about that","It looks Ugly","Looks beautiful!","*Tap him on the shoulder*","Where's the burger?"]],
            ["???","What? Oh you again? What do you want from me this time?!"],
            [player.Name,"What are you up to? I heard you might be onto the Lilypad burger!"],
            ["???","The Lilypad burger? Oh. I don't know its exact location, and I'm not after it either"],
            ["???","Look here, I heard the Lilypad burger is in some swamp so try there. And promise me that we won't meet again okay?"],
            [player.Name,"And how am I supposed to believe an enemy?"],
            ["???","Can I just be evil? Also, your common sense should've told you the burger is in some swamp anyway, there's a swamp to the left of us"],
            [player.Name,"You do realize that being evil is no better than being a burger hunter"],
            ["???","Ok you're just not gonna leave me alone, prepare!"],
        ],
        "Grassfield_2>Boulder_1" : [
            ["???","Okay look, I'll stop! That machine was so costly to build!"],
            ["???","And now it's all rubble!"],
            [player.Name,"So it really is in the swamp then..."],
            ["???","Look! I don't know where your stupid burger is! Lilypads are in swamps right?! Go there!"],
            [player.Name,"Okay, well sorry for the rubble but I got a burger to catch"],
            ["???","What?! At least give me some money! Sr Reginald Philip Moneybags will remember thiiiiis!"],
        ],
        "Boulder_1>Marky_1":[
            ["","The sounds of commotion come from an area to the left of the boulder, we should see what is going on"],
            ["person 1","Do you think you might've gone a little overboard?"],
            ["person 2","Being honest, I expected him to... move."],
            ["person 1","You've always known how Marky is, always overconfident as a newbie."],
            ["person 1","Well I feel like we should take more time to each him things, then he'd be much more capable!"],
            ["person 2","It might take a while, seeing this... But what should we do with him in the meantime?"],
            ["person 1","He should wake up fine soon as I already healed him, in the meantime, we should probably get back home"],
        ],
        "Marky_1>GrassGolem":[
            ["","The person is still asleep, what should you do?"],
            ["/Q~Ch1-4-1",["Tap them awake","Smack them awake","Do nothing"]],
            ["Person 3",["What? Stop poking me!","Ow! I know I already lost, but you don't have to rub it in!","My feel feels heavy..."],"Ch1-4-1"],
            ["Person 3","Wait, who ARE you?!"],
            [player.Name,"Hi, I was going to ask you if you know how to get past this boulder here"],
            ["Person 3", "What? That's what I wake up to?"],
        ],
        "GrassGoldem>DeadGolem":[
            ["Marky", "Woah! Watch out!"],
            ["Golem", "*rock sounds*"],
            ["/B"]//fight
        ],
        "DeadGolem>???":[
            ["Marky","the golem dissapated!"],
            [player.Name,"You're a..."],
            ["/Q~Ch1-6-2",["Good Fighter!","Bad Fighter"]]
        ],
    }
}

onEvent("Story","click",function(){
    dialogue(story["Ch"+chapter][section][SPart][0],story["Ch"+chapter][section][SPart][1]);
});

onEvent("PlayButton","click",function(){playSound("Small_Click.mp3"),setScreen("WorldMap")});

function capFirstLetter(str) {
    if (str.length === 0) {return ""}
    return str.charAt(0).toUpperCase() + str.slice(1);
}

//ACCOUNT EVENTS

onEvent("createAccount","click",function(){setScreen("AccountCreationScreen"),playSound("Small_Click.mp3")});

//CREATION--CREATION--CREATION--CREATION--CREATION--CREATION--CREATION--CREATION--CREATION--

var ACCooldown = false;

onEvent("UsernameCreation","input",function(){if (getText("UsernameCreation").length >= 20) {setText("UsernameCreation",getText("UsernameCreation").substring(0,19))}});

onEvent("createConfirm","click",function(){
    var error = "";
    playSound("Select.mp3");
    if (ACCooldown) {return}
    setText("createConfirm","...");
    var canCreate = true;
    readRecords("Users",{},function(records){
        if (records.length > 0) {
            for (var i=0; i< records.length; i++){
                if (((records[i].UsernamePassword).split("~"))[0] === getText("UsernameCreation")){
                    canCreate = false;
                    error = "that username is already taken";
                    showElement("creationError");
                    setText("creationError",error);
                }
            }
        }
    });

    var splitUser = getText("UsernameCreation").split("");
    for (var splitChar in splitUser) { //prevent the "~" from being used
        if (splitUser[splitChar] === "~") {
            error = "do not use the '~' symbol";
            showElement("creationError");
            setText("creationError",error);
            return;
        }
    }

    ACCooldown = true;
    setTimeout(function(){
        setText("createConfirm","10s");
        if (canCreate == false) {return}
        createRecord("Users",{
            UsernamePassword: getText("UsernameCreation")+"~"+getText("PasswordCreation"),
            InternalData : "",//this is here for world events, and game metadata
            Currency : "Gold~15",
            XP: 0,
            Inventory: "sugar_apple/mango/coconut",
            Story: "Ch1/Woodrock_South_Enterance/Section~Intro>Grassfield_1/SPart~-1",
            EnchantData : "sword-m1~true/cannon-m1~false/staff-m1~false/bow-m1~false/sword-m2~false/bow-m2~false",
        },function(record){
            readRecords("Users",{},function(records){
                if (records.length<0){return}
                for (var pl=0; pl<records.length;pl++){
                    if (getText("UsernameCreation")+"~"+getText("PasswordCreation") === records[pl].UsernamePassword) {
                        playerData.id = records[pl].id;
                        playerData.EnchantData = records[pl].EnchantData;
                        playerData.Currency = records[pl].Currency;
                        playerData.Xp = records[pl].XP;
                        playerData.Inventory = records[pl].Inventory;
                        playerData.saveData = records[pl].Story;
                        playerData.internalData = records[pl].InternalData;
                        playerData.UsernamePassword = getText("UsernameCreation")+"~"+getText("PasswordCreation"),
                            loadPlayerData();
                    }
                }
            });
        });
    },1000);
    setTimeout(function(){ACCooldown = false,setText("createConfirm","create")},10000);
});

function loadPlayerData(){
    enchants.equipped = [];
    enchants.unequipped = [];
    var splitName = playerData.UsernamePassword.split("~");
    player.Name = splitName[0];
    Inventory = decodeData(playerData.Inventory);
    internalData = decodeData(playerData.internalData);
    var tcurrency = decodeData(playerData.Currency,true);
    for (var money in tcurrency){currency[tcurrency[money][0]] = tcurrency[money][1]}
    var splitStory = decodeData(playerData.saveData,true);
    var decompressedEnchants = decodeData(playerData.EnchantData,true);
    for (var ench in decompressedEnchants) {if (decompressedEnchants[ench][1] == "true") {enchants.equipped.push(decompressedEnchants[ench][0])} else {enchants.unequipped.push(decompressedEnchants[ench][0])}}
    location = splitStory[1];
    chapter = splitStory[0].substring(2,splitStory[0].length);
    section = splitStory[2][1];
    SPart = splitStory[3][1];
    sceneBuilder(world[location]);
    updatePlayerLevels();
    enchants.update();
}

onEvent("login","click",function(){setScreen("LoginScreen"),playSound("Small_Click.mp3")});

var ALCooldown = false;
onEvent("LoginButton","click",function(){
    playSound("Big_Click.mp3");
    if (ALCooldown) {return}
    ALCooldown = true;
    setText("LoginButton","...");
    var found = false;
    var combinedUserData =getText("loginUser")+"~"+getText("loginPass");
    readRecords("Users",{},function(records){
        if (records.length<0){return}
        for (var pl=0; pl<records.length;pl++){
            if (combinedUserData === records[pl].UsernamePassword) {
                found = true;
                playerData.UsernamePassword = combinedUserData,
                    playerData.id = records[pl].id;
                playerData.Currency = records[pl].Currency;
                playerData.Xp = records[pl].XP;
                playerData.Inventory = records[pl].Inventory;
                playerData.saveData = records[pl].Story;
                playerData.internalData = records[pl].InternalData;
                playerData.EnchantData = records[pl].EnchantData;
                loadPlayerData();
            }
        }
    });
    setTimeout(function(){
        setText("LoginButton","Login");
        ALCooldown = false;
    },5000);
});

onEvent("back1","click",function(){setScreen("Menu"),playSound("Small_Click.mp3")});
onEvent("back3","click",function(){setScreen("Menu"),playSound("Small_Click.mp3")});

onEvent("updateLogButton", "click", function( ) {setScreen("UpdateLog")});
onEvent("backToMenu","click",function(){setScreen("Menu")});

//SPINNY WHEEL; surprisingly, it can handle ~100 objects (on a medium-good laptop) without major fps drops
var velocity = 0;
var wheelRadius = 80;
var pi = 3.1415296;
var mouseOverWheel = false;
var spinDebounce = false;
//the POINTER position is at pi/2 (90) degrees btw, so find stuff that lands on that range

var wheel = {//WEIGHT IS OUT OF 360! Min should be 20 (reccomended at least), 40 is the default
    emptyDegree : 0,//this is used to offset items on the wheel
    elements : {},// name : {degree:?, weight:?,wheelPos:?} degree is for the unit circle conversion, weight is likelihood and bias
    reward : function(){
        var foundPrize = false;
        setTimeout(function(){spinDebounce=false},1000);
        for (var stuff in wheel.elements) {
            if (wheel.elements[stuff].degree <=90 && wheel.elements[stuff].degree + wheel.elements[stuff].weight >90) {
                setText("prompt","you won "+stuff+"!!!");
                var tweenOut = new TweenService.create(stuff,{x:130,y:15,width:75,height:75},1,'Sine','In',120);
                tweenOut.play();
                foundPrize = true;
            }
            if (!foundPrize) {
                setText("prompt","you won nothing!!! like actually...");
            }
        }
        playSound("sound://category_achievements/puzzle_game_achievement_01.mp3");
    },
    spin : function(){
        function tick(){
            setTimeout(function(){
                if (velocity<0.05){wheel.reward(),velocity=0;
                    return}

                for (var obj in wheel.elements){
                    if (obj == "nothing"){continue}
                    var nextv= (wheel.elements[obj].degree+velocity) % 360//this keeps it within the 360 deg. range and allows for high velocities
                    if (wheel.elements[obj].degree < 90 && nextv>=90 || wheel.elements[obj].degree>nextv){playSound("sound://category_objects/click.mp3")}
                    wheel.elements[obj].degree = nextv;
                    setPosition(obj,
                        155-(wheelRadius*Math.cos(nextv*(pi/180))),//remember the nextv is always stored in deg. so reconvert it back to radians
                        210-(wheelRadius*Math.sin(nextv*(pi/180))),
                        25,
                        25
                    );
                    wheel.elements[obj].degree += velocity;
                }
                velocity*=0.96;
                tick();
            },20);
        }
        tick();
    },
    update : function(stuff){//stuff is a nested array [[item,weight],[item2,weight2]]
        for (var name in wheel.elements) {deleteElement(name)}
        wheel.emptyDegree = 0;
        wheel.elements = {};
        for (var thing in stuff) {
            if (stuff[thing][1] + wheel.emptyDegree>360) {throw new Error("the wheel cannot have element "+thing+"! It exceeds 360 degrees")}
            var objVal = 25
            instance.newImage(stuff[thing][0],155-(wheelRadius*Math.cos(wheel.emptyDegree*(pi/180))),210-(wheelRadius*Math.sin(wheel.emptyDegree*(pi/180))),objVal,objVal,"Nil.png");
            //the reason why we convert into radians is because if you remove the conversion, you see ugly overlap so radians takes care of it
            // TEMPORARY; itll have a way of setting image later!
            var iTab = [];//just grab a random item from the item list for now
            for (var i in items){iTab.push(i)}
            var ran = iTab[randomNumber(0,iTab.length-1)];
            setImageURL(stuff[thing][0],items[ran].image);

            wheel.emptyDegree+=stuff[thing][1];
            wheel.elements[stuff[thing][0]] = {degree : wheel.emptyDegree,weight:stuff[thing][1], image:items[ran].image};
        }
    }
};

onEvent("exitWheel","click",function(){setScreen("Menu")});

onEvent("SpinWheel","mouseover",function(e){if (e.fromElementId === "wheel") {mouseOverWheel = true} else {mouseOverWheel = false}});
onEvent("SpinWheel","mousemove",function(e){
    if (!mouseOverWheel || spinDebounce) {return}
    spinDebounce = true;
    velocity+= Math.abs(e.movementY+e.movementX);
    wheel.spin();
});

onEvent("spinButton","click",function(){if (spinDebounce) {return}
    setScreen("SpinWheel"),wheel.update(list);});

var list = [];

for (var v = 0;v<30;v++){//as long as v and the weight multiplied by each other are equal to or less than 360, it will work
    list.push(["item"+v,10]);//20 is the "weight"
}
//fun fact; for 3 elements with 60 weight each on 5% decay, it always lands on the third object first!

onEvent("spin","click",function(){
    velocity = 500;
    wheel.spin();
});

onEvent("guideBookButton","click",function(){setScreen("guidebook")});
onEvent("back5","click",function(){setScreen("Lobby")});

//PC CONTROLS \\ PC -|- PC -|- PC -|- PC -|- PC -|-PC -|-PC -|- PC -|-PC -|-PC -|-PC -|-PC -|-PC -|- PC -|- PC -|-
onEvent("WorldMap","keypress",function(e){
    if (e.keyCode === 32) {
        setScreen("Lobby");
    }
});

onEvent("Lobby","keypress",function(e){
    if (e.keyCode === 32) {
        setScreen("WorldMap");
    }
});

curSong = "recursion_main.mp3";
playSound("recursion_main.mp3",true);
console.log("Client took "+(getTime()-startTime).toString()+ " miliseconds to initialize.");
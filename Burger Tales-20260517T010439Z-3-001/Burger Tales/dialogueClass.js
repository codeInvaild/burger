import { dialogueDirectory } from "./dialogueDirectory.js"
import {newRect, newText, randInt} from "./Utility.js"
import { mouse } from "./MouseInputHandler.js"
import {playerController} from "./PlayerController.js";
import {keybinds} from "./KeyboardInputHandler.js";
import {availableAssets} from "./AssetLoader.js";
import {battle} from "./BattleHandler.js";
import {world} from "./WorldHandler.js";

//what does this do?
/*
* This script allows the user to create a class that contains dialogue
* The script itself IS the interpreter
* We will contain information such as speaker data, text, text modifiers (color, animations, etc...), and even internalData logs that help make it unique
* the dialogue class below makes it easy to set up and draw from the same instance
*/

let textEffects = {
    shake(){}
}

export let dialogue = {

    dialoguePresent : false,

    x : 200,
    y : 500,
    width : 800,
    height : 200,
    dialogueIndex : -1,
    characterIndex : 0,
    localElapsedTime : 0, //in milliseconds

    characterSize : 15, //seperate from width to avoid high spacing with monospace fonts
    characterWidth : 25, //pixel width
    characterHeight : 25,
    startingYBuffer :20,

    continueBoxSize : 80,

    selectedData : {who:"nobody",textIdentifier:"none"},

    punctuationPeriod : 800,
    punctuationComma : 400,
    textSpeed : 50,
    playerInteract : false,

    //local dialogue stats
    name : "",
    textFinished : false,
    resolving : false, //do not run the update loop if we need to resolve an action; such as asking questions or receiving user input

    precomputedText : [],

    precomputeWordWrapping : function(text){//Sorry for the comment spam, I really wanted to make sure I could understand it in case I forgot in the future
        if (!text) {return}

        let final = [];
        let split = text.split(" ");
        let carrier = "";
        for (let word of split) {
            //we identify carriers; values that have text modifications (different color, animations, size, etc...)
            //@ defines the start of a carrier
            //@end defines the end of a carrier, and it goes back to normal styling                    v this first parenthesis is "split" further below to cleanly differentiate type and value
            //this specifically looks for a type with it's values enclosed in parenthesis (example: rgb(255,255,255))
            //                                                                                      ^type  ^values in the parenthesis
            //the program knows the difference between values and types as types are defined first, and when it sees a parenthesis,
            // it knows inside of that are the values, and it finds the ending parenthesis to complete what the value(s) is
            //You can stack styles! They are divided by a "/" written as a string,
            //AFTER THE LAST "/", IT IDENTIFIES IT AS THE TEXT YOU WANT THE STYLING ADDED ON TO!
            if (word.substring(0, 1) === "@" && word.substring(0, 4) !== "@end") {//for a start or end cue
                let splitStyle = word.split("/");//splits all the identified styles
                let subCarrier = []//small array containing the identified type and value pair
                for (let i = 0; i < splitStyle.length - 1; i++) {
                    //we pull every modifier pair from this carrier and dump it into a subcarrier array (shown above)
                    let separated = splitStyle[i].split("(");
                    //"separated" gives us the type [0] and value [1], using the first parenthesis to differentiate between the two (the first parenthesis is discarded from the split function btw)
                    //you'll see below the program then just substrings around the residual parenthesis and starting "@" to get a clean type and value list
                    if (separated[0].substring(0,1)==="@") {//the first modifier always has the @ in the start, so we substring around it to remove that
                        subCarrier.push( {type:separated[0].substring(1,separated[0].length) ,value: separated[1].substring( 0, separated[1].length - 1 ) } );
                    } else {
                        subCarrier.push({type:separated[0], value:separated[1].substring(0, separated[1].length - 1)});
                    }
                }
                carrier = subCarrier;
                final.push([splitStyle[splitStyle.length - 1], carrier]);
            } else if (word.substring(0, 4) === "@end"){//make sure future letters/words don't carry the same properties as we should've ended it now
                carrier = "";
            } else {//this should only carry on the carrier values when we don't see the stopper yet (@end)
                final.push([word,carrier]);
            }
            // console.log(this.precomputedText)
        }
        //now that FINAL has the words, we break that down even further into LETTERS and add extra positional metadata

        //word positions are screen-space relative, DO NOT USE CAMERA VALUES
        let currentX = 0;
        let currentY = 0;

        for (let word of final) {
            let letterWidth = this.characterWidth;
            let letterHeight = this.characterHeight;
            let SPACING = 3/4 * letterWidth;

            if (word[1]) {
                for (let style of word[1]) {
                    if (style.type === "size") {
                        letterWidth = style.value;
                        letterHeight = style.value;
                        console.log("we changed the size bruh");
                    }
                }
            }



            if ((word[0].length * letterWidth)+ SPACING + currentX > this.width) {
                currentX=0;
                currentY+=letterHeight;
            }

            for (let letterIndex=0; letterIndex<word[0].length; letterIndex++) {
                this.precomputedText.push({letter:word[0][letterIndex], x:currentX,y:currentY + this.startingYBuffer,size:letterWidth, style : word[1]});
                currentX += (letterWidth-10) + (letterIndex === word[0].length-1 ? SPACING : 0);
            }

        }
        dialogue.resolving = false;
    },

    handlePlayerInput : function() {
        this.playerInteract = true;

        if (!this.textFinished) {
            console.log("INPUT A");
            this.characterIndex = this.precomputedText.length-1;
            this.textFinished = true;
        } else if (this.textFinished) {
            console.log("INPUT B");
            dialogue.textFinished = false;
            this.dialogueIndex++;
            dialogue.dialoguePresent = false;
            dialogue.localElapsedTime = 0;
            dialogue.precomputedText = [];
            dialogue.characterIndex = 0;
            dialogue.resolve(dialogue.name);
        }
    },


    update : function(delta) {
        if (dialogue.selectedData.who !== "nobody" &&
            dialogue.dialogueIndex > dialogueDirectory[dialogue.selectedData.who][dialogue.selectedData.textIdentifier].length-1 &&
            dialogue.playerInteract
        ) {
            dialogue.dialogueIndex = -1;
            dialogue.textFinished = false;
            this.playerInteract = false;
            dialogue.dialoguePresent = false;
            dialogue.selectedData = {who:"nobody",textIdentifier:"none"};
            playerController.state = "active";
            dialogue.localElapsedTime = 0;
            dialogue.characterIndex = 0;
            dialogue.precomputedText = [];
            console.log("We are giving back control");
            return;
        }
        if (dialogue.dialogueIndex < 0 || dialogue.resolving) {return}
        let rect = newRect("dialogueBoxBG",dialogue.x - this.characterSize, dialogue.y - this.characterSize,dialogue.width + this.characterSize,dialogue.height + this.characterSize,"rgb(218,203,166)");
        rect.draw();

        this.localElapsedTime += delta * 1000;

        if (!this.textFinished) {
            let delayTime = this.textSpeed;
            for (let styleI of this.precomputedText[this.characterIndex].style) {
                if (styleI.type === "speedMs") {
                    delayTime = styleI.value;
                }
            }

            if (this.localElapsedTime > delayTime) {
                this.characterIndex++;
                this.localElapsedTime-=delayTime;

                availableAssets.sounds[this.selectedData.voice].play();
            }
        } else {
            newRect("dialogueBoxContinueBox",dialogue.x + dialogue.width -(this.continueBoxSize/2),this.y - (this.continueBoxSize/2),this.continueBoxSize,this.continueBoxSize,"rgb(0,0,0)").draw();
            newText("dialogueBoxContinueBoxText",dialogue.x + dialogue.width -(this.continueBoxSize/2),this.y,"rgb(255,255,255)",(this.continueBoxSize/2)+"px Courier New",keybinds.Interact).draw();
        }

        for (let [index,character] of this.precomputedText.entries()) {
            if (index <= this.characterIndex) {
                let color = "rgb(0,0,0)";
                let size = dialogue.characterWidth;
                let textX = character.x + this.x;
                let textY = character.y + this.y;
                let wavy=null;
                let styleStartIndex = 1;
                let styleEndIndex = 1;
                for (let styleI of this.precomputedText[index].style) {
                    if (styleI.type === "rgb") {
                        color = "rgb("+styleI.value+")";
                    }
                    if (styleI.type === "size") {
                        size = styleI.value;
                    }
                    if (styleI.type === "wavy") {
                        if (index-1 >-1) {
                            if (this.precomputedText[index]?.style.length === 0) {
                                styleStartIndex = index;
                            }
                        }

                        if (index+1 < Object.keys(this.precomputedText).length-1) {
                            if (this.precomputedText[index+1].style.length === 0) {
                                styleEndIndex = index;
                            }
                        }

                        wavy = styleI.value.split(",");
                        let percentage = (index/24) * (Math.PI*2)
                        textX = textX + -(Math.cos(performance.now() / 1000 * wavy[1] + percentage) * wavy[0]);
                        textY = textY + (Math.sin(performance.now() / 1000 * wavy[1] + percentage) * wavy[0]);
                    }
                    if (styleI.type === "shake") {
                        textX = textX + randInt(-styleI.value,styleI.value);
                        textY = textY + randInt(-styleI.value,styleI.value);
                    }
                }

                if (wavy) {

                    // textX = textX + -(Math.cos(performance.now() / 1000 * wavy[1] - index) * wavy[0]);
                    // textY = textY + (Math.sin(performance.now() / 1000 * wavy[1] + index) * wavy[0]);
                }


                newText("character_"+character.letter+"_"+index,
                    textX,
                    textY,
                    color,
                    size+"px Courier New",
                    character.letter
                ).draw();
            }
        }

        if (this.precomputedText.length-1 === this.characterIndex) {this.textFinished = true;}
    },

    //you should run this, not the update function. This lets us know which dialogue to use
    resolve : function (dialogueName,startingIndex = false) {
        dialogue.resolving = true;
        if (dialogue.dialoguePresent) {return}
        dialogue.dialoguePresent = true;

        if (!dialogueDirectory[dialogueName]) {Error("dialogue directory not found.");} else if (dialogueDirectory[dialogueName]?.normal === null) {Error("You did not supply a normal (default) for this dialogue: "+dialogueName)}
        dialogue.name = dialogueName;
        //figure out if something is occupying it
       for (let i = 0; i < Object.keys(dialogueDirectory[dialogueName]).length; i++) {
           const identifier = Object.keys(dialogueDirectory[dialogueName])[i];
           if (identifier.split("-")[0] === "STORY") {//Main story specific things
               //execute special code or smth
           } else if (identifier.split("-")[0] !== "STORY" && identifier.split("-")[0] !== "normal") {//checking if we have other quests besides the story
               //push this into a quest array
           } else if (identifier.split("-")[0] === "normal") {
               dialogue.dialogueIndex= startingIndex ? 0 : dialogue.dialogueIndex;
               let dialogueInst = dialogueDirectory[dialogueName][identifier][dialogue.dialogueIndex];
               if (dialogueInst?.battle) {
                   //trigger battle mechanics by loading it into the player controller
                   this.dialoguePresent=false;
                   dialogue.name = "";
                   playerController.state = "battle";
                   //battle start needs correct parameters
                   console.log(dialogueInst.battle)
                   battle.start(dialogueInst.battle.enemies,world.currentLocation, dialogueInst.battle.backgroundData);
               } else if (dialogueInst?.text) {

                   this.precomputeWordWrapping(dialogueInst?.text)
                   dialogue.selectedData = {who:dialogueName, textIdentifier:identifier,
                       voice:dialogueDirectory[dialogueName][identifier][dialogue.dialogueIndex]?.voice ? dialogueDirectory[dialogueName][identifier][dialogue.dialogueIndex]?.voice : "OO_Talk"
                   };
               }

               break;
           } else {
               dialogue.dialogueIndex=-1;
               break;
           }
       }
    }
}

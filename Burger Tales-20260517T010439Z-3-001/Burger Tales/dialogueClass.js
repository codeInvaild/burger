import { dialogueDirectory } from "./dialogueDirectory.js"
import { newRect , newText } from "./Utility.js"
import { mouse } from "./MouseInputHandler.js"
import {playerController} from "./PlayerController.js";

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

    characterSize : 25, //seperate from width to avoid high spacing with monospace fonts
    characterWidth : 40, //pixel width
    characterHeight : 60,

    selectedData : {who:"nobody",textIdentifier:"none"},

    punctuationPeriod : 800,
    punctuationComma : 400,
    textSpeed : 40,
    playerInteract : false,

    //local dialogue stats
    name : "",
    textFinished : false,
    resolving : false, //do not run the update loop if we need to resolve an action; such as asking questions or receiving user input

    precomputedText : [],

    precomputeWordWrapping : function(text){//PLEASE PERFORM A UNIT TEST ON THIS, IDK IF IT WORKS YET
        if (!text) {return}

        let final = [];
        let split = text.split(" ");
        let carrier = "";
        for (let word of split) {
            if (word.substring(0, 1) === "@" && word.substring(0, 4) !== "@end") {
                let splitStyle = word.split("/");
                let subCarrier = []
                for (let i = 0; i < splitStyle.length - 1; i++) {
                    let seperated = splitStyle[i].split("(");
                    if (seperated[0].substring(0,1)==="@") {
                        subCarrier.push([seperated[0].substring(1,seperated[0].length), seperated[1].substring(0, seperated[1].length - 1)]);
                    } else {
                        subCarrier.push([seperated[0], seperated[1].substring(0, seperated[1].length - 1)]);
                    }

                }
                carrier = subCarrier;
                final.push([splitStyle[splitStyle.length - 1], carrier]);
            } else if (word.substring(0, 4) === "@end"){//remove the carrier
                carrier = "";
            } else {
                final.push([word,carrier]);
            }
        }
        //now that FINAL has the words, we break that down even further into LETTERS and add extra positional metadata

        //word positions are screen-space relative, DO NOT USE CAMERA VALUES
        let currentX = 0;
        let currentY = 0;

        for (let word of final) {
            const SPACING = 3/4 * this.characterWidth;
            if ((word[0].length * this.characterWidth)+ SPACING + currentX > this.width) {
                currentX=0;
                currentY+=this.characterHeight;
            }

            for (let letterIndex=0; letterIndex<word[0].length; letterIndex++) {
                this.precomputedText.push({letter:word[0][letterIndex], x:currentX,y:currentY+50, style : word[1]});
                currentX += this.characterSize + (letterIndex === word[0].length-1 ? SPACING : 0);
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
        if (dialogue.selectedData.who !== "nobody" && dialogue.dialogueIndex > dialogueDirectory[dialogue.selectedData.who][dialogue.selectedData.textIdentifier].length-1 && dialogue.playerInteract) {
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
        let rect = newRect("dialogueBoxBG",dialogue.x,dialogue.y,dialogue.width,dialogue.height,"white");
        rect.draw();

        this.localElapsedTime += delta * 1000;

        if (!this.textFinished) {
            let delayTime = this.precomputedText[this.characterIndex]?.letter === "." ? this.punctuationPeriod :
                this.precomputedText[this.characterIndex]?.letter === "," ? this.punctuationComma : this.textSpeed;

            if (this.localElapsedTime > delayTime) {
                this.characterIndex++;
                this.localElapsedTime-=delayTime;
            }
        }

        for (let [index,character] of this.precomputedText.entries()) {
            if (index <= this.characterIndex) {
                newText("character_"+character.letter+"_"+index,character.x + this.x,character.y+this.y,"rgb(255,255,255)",dialogue.characterWidth+"px Courier New",character.letter).draw();
            }
        }

        if (this.precomputedText.length-1 === this.characterIndex) {this.textFinished = true;}
    },

    //you should run this, not the update function. This lets us know which dialogue to use
    resolve : function (dialogueName,startingIndex = false) {
        dialogue.resolving = true;
        if (dialogue.dialoguePresent) {return}
        dialogue.dialoguePresent = true;

        if (!dialogueDirectory[dialogueName]) {Error("dialogue directory not found.");} else if (dialogueDirectory[dialogueName]?.normal === null) {Error("You did not supply a normal for this dialogue: "+dialogueName)}
        dialogue.name = dialogueName;
        //figure out if something is occupying it
       for (let i = 0; i < Object.keys(dialogueDirectory[dialogueName]).length; i++) {
           const name = Object.keys(dialogueDirectory[dialogueName])[i];
           if (name.split("-")[0] === "STORY") {
               //execute special code or smth
           } else if (name.split("-")[0] !== "STORY" && name.split("-")[0] !== "normal") {//checking if we have a quest
               //push this into a quest array
           } else if (name.split("-")[0] === "normal") {
               dialogue.dialogueIndex= startingIndex ? 0 : dialogue.dialogueIndex;
               this.precomputeWordWrapping(dialogueDirectory[dialogueName][name][dialogue.dialogueIndex]?.text)
               dialogue.selectedData = {who:dialogueName, textIdentifier:name};
               break;
           } else {dialogue.dialogueIndex=-1; break;}
       }
    }
}
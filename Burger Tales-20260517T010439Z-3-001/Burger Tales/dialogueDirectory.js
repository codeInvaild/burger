//documentation for this is on the bottom (commented out)

export const dialogueDirectory = {
    guy : {
        normal : [
            {
                speaker: "Guy",
                text : "What are you doing here?",
            },
            {
                speaker: "Guy",
                text : "Perlin noise",
            },
        ]
    },
    dog : {
        normal : [
            {
                text : "placeholder text 1",
            },
            {
                text : "@wavy(15,6)/Super Wavy text! @end wow!",
            },
            {
                text : "testing @rgb(255,2,2)/shake(1,1,1)/speedMs(100)/custom font! @end now! And never ever try this again I really hope @rgb(0,255,0)/text @end isn't just 1 big text box",
            },
            {
                text : "Here is some super long string of text that we need to test and see if the skipping feature works aaaand I @wavy(5,12)/also @end need to know if you robbed the @wavy(5,10)/pneumaunrosrotoiscoliscois @end store ok yes? sure why not man",
            },
        ]
    },
    textTester : {
        normal : [
            {
                text : "Hiiiiii~",
                voice:"Female_1",
            },
            {
                text : "Mind if I test some text with you?~",
                voice:"Female_1",
            },
            {
                text : "I @rgb(255,0,255)/ love @end testing text",
                voice:"Female_1",
            }
        ],
    },

    Iris_1: {
        normal : [
            {
                text:"...",
                voice:"Female_2",
            },
            {
                text:"guess you're the one I must partner with",
                voice:"Female_2",
            },
            {
                text:"Just don't slow me down.",
                voice:"Female_2",
            },
        ]
    },

    Angry_man: {
        normal : [
            {
                text:"HEY YOU!",
                voice:"Male_1",
            },
            {
                text:"You @size(50)/rgb(250,120,83)/BRAT! @end , I hate the way you're eyeing me!",
                voice:"Male_1",
            },
            {
                battle: {
                    enemies : ["grass_dweller","grass_dweller","grass_dweller"],
                    backgroundData: [
                        {name:"sky",x:-100,y:-100,width:1920 * 1.5,height:1080 * 1.5,image:"sky"},
                        {name:"grass", rectangle:true, x:-500, y:300, width:2920, height:2080, color:"rgb(39,129,95)"}
                    ]
                },
            }
        ],
    },

    stealer: {
        normal : [
            {
                text:"Hey @shake(2)/Kid! @end",
            },
            {
                text:"Mind telling me the @rgb(100,100,5)/3 @end numbers on the back of your @rgb(87,9,172)/credit card? @end and the number on the back of it too?"
            },
            {
                text:"@wavy(15,6)/shake(2)/You can't find me bruh @end"
            },
            {
                text:"just @speedMs(1000)/... @end @size(50)/rgb(255,0,0)/wavy(40,7)/GIVE IT TO ME! @end"
            }
        ]
    },

    aiden: {
        normal : [
            {
                text:"have you heard of the wonderful consumable item @rgb(255,0,0)/wavy(5,3)/soup? @end i love soup its yummy in my tummy. here take some of my @wavy(5,2)/ finest @end soup."
            },


        ]
    },

    thinker:{
        normal : [
            {
                text:"If thinking is my power, then what am I without it?",
            },
            {

            }
        ]
    }





}


/*
* DIRECTORY DOCUMENTATION:
*
* 1. when declaring a new key, declare it in the name of said entity
* ex:
* dialogueDirectory = {
*   newGuy : {},
* }
*
* 2. Give the entity AT LEAST a default parameter (called "normal"); so default text if they get interacted with
*
* optional:
* If they are needed for a quest, add a new key within them as the quest name (ex: "fishing-1")
* If they are needed for the story, add a new key within them as "STORY", THIS ALWAYS TRIGGERS UNTIL THEY ARE NOT NEEDED (after the player moves onto the next part of the quest)
*
* ! NOTE ! -> For the two optional parameters, make sure you provide a PART inside the key! Refer to examples
* ? Doing this allows you to reuse the same npc multiple times for the same quest
*
* example:
*
* dialogueDirectory = {
*   newGuy : {
*       STORY-2 : [
*           {
*               speaker : "???",
*               text : "Woah dude, he looks s-sc-scary!!!!!",
*           }
*       ],
*
*       exampleQuest-1 : [
*           {
*               speaker : "bruh",
*               text: "Help me find the guy that changed my name!!!!!"
*           }
*       ]
*
*       normal : [
*               {
*                   speaker : "Guy",
*                   text : "Blah blah blah [b]blah[/b]",
*               },
*               {
*                   speaker : "Guy",
*                   text : "I love this new system!",
*               },
*               {
    *               speaker : "Pessimistic Guy",
    *               text : "Dude you realize this is more verbose than your ES5 implementation right?",
*               },
*               {
*                   speaker : "Guy",
*                   text : "Ha! But it's more maintainable!",
*               },
*           ]
*   }
* }
*
* -- HOW TO FORMAT THE ACTUAL DIALOGUE --
*
* Dialogue has 2 necessary parameters:
*   > speaker; this pops up to let the player know who's talking
*   > text (you can make this optional on ONE specific case): This is where you put where they say, there are custom styling tags as you saw from the examples
*       ! You will see syntax like: @param(arg...) <- this starts the style
*       ! To END the syntax, you must type @end
*       ! If you would like to STACK styles, use commas; @rgb(2,2,2),size(12) Cool text here! @end
*       > rgb(red,green,blue); changes text color according to rgb values (0-255)
*       > size(size in pixels); changes font size
*       > font(font name); changes font
*       > speed(delay in milliseconds); changes how fast the word is typed out, IGNORES PUNCTUATION GUARDRAILS
*       > sprite(image directory name); changes speaker sprite to the one you declared FOR THIS DURATION ONLY, reverts to the normal one specified after
*       > shake(magnitude, duration?); shakes text based on magnitude, if a duration is supplied, it will last that long, otherwise it lasts forever
*       ! Punctuation affects how it is typed out
*       > ","; 600 ms delay
*       > "."; 800 ms delay
*       > "?"; 700 ms delay
*       > "!"; 800 ms delay
*
* OPTIONAL PARAMETERS:
*   > sprite : provide a string as the value and it will display said image
*   > question : { id: "something you can call to later, be sure to avoid duplicate names" , question : "question shows up as dialogue", answers : ["opt1","opt2"]}
*       > answers are kept in a data table
*       > you CAN declare a speaker if the speaker changed, otherwise, the old one is used
*   > answer : { questionName : "take the id from the question you declared", answers: ["a","b"]}
*       > answers go by the index of their original question indexes
*   > progress : { questName } <- increases quest part by 1, only use at the end of a dialogue sequence
*   > dataPush : { data } <- pushes a string into internalData, normally to update events
*   > dataRemove : { data } <- not recommended, but it removes from internalData
*   > give : { item } <- grants an item
*   > battle : { enemyData : {look in battle handler or smth} } <- use for set battles
* */

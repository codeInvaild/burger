/*
*
* what does a quest want?
*
* a quest should have:
*
* THE KEY OF THE QUEST IS THE NAME
* > part: unsigned integer; ex: part 1,2,3,4,5,6... this helps specific npcs find what part of the quest they want to interact with
* > completed: boolean; helps specific actions take place if x is completed (or helps npcs ignore their quest action)
* > progress : number (percent) ; % of a part done
*
* example?
* static activeQuests = {
*   Story : {part : 5, completed : false},
*   SideQuest1 : {part : 1, completed : false},
*   ... and so on ...
* }
*
*
* when we save the game, playerData.quests takes from this as the save information
* */


export let quest = {
    activeQuests : {
        STORY : {
            part:1,
            completed:false,
            progress:0,
        }
    },

    assignQuest(name) {
        if (quest.activeQuests[name]) return false;
        quest.activeQuests[name] = {part : 1, completed : false, progress : 0};
    }
}
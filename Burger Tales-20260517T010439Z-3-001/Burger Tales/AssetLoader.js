//ALL ASSETS MUST BE PUT HERE, OTHERWISE THEY WILL NOT BE FOUND
export const assets = {
    images: {
        hammer: "Assets/images/fixItHammerDisortion.jpg",
        title : "Assets/images/burg.png",
        sadFace: "Assets/images/sadFace.png",
        grass: "Assets/images/grass.jpg",
        dirt: "Assets/images/dirt.png",
        water: "Assets/images/water.jpg",
        tree2: "Assets/images/tree2.png",
        asgore : "Assets/images/asgore.jpg",
        explosion : "Assets/images/low-quality-explosion.gif",
        man : "Assets/images/man.png",
        ketchup : "Assets/images/Ketchup.png",
    },
    music : { //WE CAN ONLY ACCEPT MP3s
        bling : "Assets/music/bling.mp3",
    }
};

export let assetCount = 0;

export let availableAssets = {
    images: {},
    music: {},//music is separated in a different category because we want it to loop mainly
    sounds : {},
};

export function loadAsset(type, src, id) {
    return new Promise((resolve, reject) => {
        if (type === "images") {
            const img = new Image();
            img.src = src;

            img.onload = () => {
                assetCount++;
                availableAssets[type][id] = img;
                console.log(`Loaded ${id}`);
                resolve(img);
            };
            img.onerror = () => reject("Failed to load " + id);
        } else if (type === "music") {
            const audio = new Audio(src);
            audio.loop = true;
            audio.oncanplaythrough = () => {//ensures that the ENTIRE audio is ready to be played
                assetCount++;
                console.log(`Music loaded: ${id}`);
                resolve(audio);
                availableAssets[type][id] = audio;
            }
            audio.onerror=()=>reject("Failed to load " + id);
        } else if (type === "sounds") {
            const audio = new Audio(src);
            audio.oncanplaythrough = () => { //ensures that the ENTIRE sfx is ready to be played
                assetCount++;
                console.log(`Audio loaded: ${id}`);
                availableAssets[type][id] = audio;
                resolve(audio);
            }
            audio.onerror=()=>reject("Failed to load " + id);
        }
    })


}

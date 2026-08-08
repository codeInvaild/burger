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
        angry_man:"Assets/images/angryMan.png",
        aura_man:"Assets/images/aura_man.png",
        banana: "Assets/images/banana (1).png",
        fish: "Assets/images/fish.png",
        silhouette_man:"Assets/images/Man_Silhouette (1).png",
        rotisserie_chicken: "Assets/images/Rotisserie_Chicken.png",
        sugar_apple: "Assets/images/sugar_apple (1).png",
        tungsten_cube: "Assets/images/tungsten.png",
        woman: "Assets/images/woman.png",
        woman2: "Assets/images/woman2.png",
        cobalt: "Assets/images/Knight.png",
        illumine: "Assets/images/fire_mage.png",
        flurrine: "Assets/images/water_spirit.png",
        sky: "Assets/images/bg_1.jpg",
        cornball: "Assets/images/cornball.jpeg",
    },
    music : { //WE CAN ONLY ACCEPT MP3s
        //please note all of the music right now is temporary and should be removed later
        //there are DELTARUNE tracks because it's funny and I need them as a placeholder
        bling : "Assets/music/bling.mp3",
        black_knife:"Assets/music/black_knife.mp3",
        dark_sanct:"Assets/music/Dark Sanctuary.mp3",
        second_sanct:"Assets/music/Second_Sanctuary.mp3",

    },
    sounds: {
        click: "Assets/sounds/badClick.wav",
        grunt:"Assets/sounds/zombie_grunt.wav",
        gp:"Assets/sounds/grunts_plural.wav",
        getReady:"Assets/sounds/Getready.mp3",
        Female_1:"Assets/sounds/Female_1.mp3",
        Female_2:"Assets/sounds/Female_2.mp3",
        Female_3:"Assets/sounds/Female_3.mp3",
        Female_4:"Assets/sounds/Female_4.mp3",
        Male_1:"Assets/sounds/Male_1.mp3",
        Male_2:"Assets/sounds/Male_2.mp3",
        Male_3:"Assets/sounds/Male_3.mp3",
        Male_4:"Assets/sounds/Male_4.mp3",
        OO_Talk: "Assets/sounds/OO_Talk.mp3",
        OO_Hurt: "Assets/sounds/OO_Hurt.mp3",
        OO_Miss: "Assets/sounds/OO_Miss.mp3",
        OO_Dodge: "Assets/sounds/OO_Dodge.mp3",
        back:"Assets/sounds/back.mp3",
        confirm:"Assets/sounds/click_confirm.mp3",
        navigate:"Assets/sounds/navigate.mp3",
    }
};

export let assetCount = 0; // used to make sure all assets are loaded

export let availableAssets = {
    images: {},
    music: {},  // music is separated in a different category because we want it to loop mainly
    sounds: {},
};

// --- Web Audio setup (module-level, one instance shared by everything) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);

const musicGain = audioCtx.createGain();
const sfxGain = audioCtx.createGain();
musicGain.connect(masterGain);
sfxGain.connect(masterGain);

// Browsers block audio until a user gesture happens on the page.
// This resumes the context automatically on first click/keypress.
function unlockAudio() {
    if (audioCtx.state === "suspended") audioCtx.resume();
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
}
document.addEventListener("click", unlockAudio);
document.addEventListener("keydown", unlockAudio);

// Exported so you can wire up volume sliders in a settings menu later
export function setMusicVolume(v) { musicGain.gain.value = v; }
export function setSfxVolume(v) { sfxGain.gain.value = v; }
export function setMasterVolume(v) { masterGain.gain.value = v; }

/**
 * Builds the playable asset object stored at availableAssets[type][id].
 * Every .play() call creates a fresh source node from the shared decoded
 * buffer, so sounds.gunshot.play() spammed rapidly overlaps correctly —
 * no cloning or pooling needed.
 */
function createAudioAsset(decodedBuffer, type) {
    const bus = type === "music" ? musicGain : sfxGain;
    const activeSources = new Set();
    const defaultLoop = type === "music"; // matches your old audio.loop = true for music

    return {
        buffer: decodedBuffer,
        type,

        /**
         * options:
         *   volume       (0-1, default 1)
         *   loop         (default true for music, false for sounds)
         *   playbackRate (default 1, e.g. 0.9-1.1 for pitch variation on sfx)
         *   loopStart    (seconds, optional - intro-then-loop-body music)
         *   loopEnd      (seconds, optional)
         *   retrigger    (default false — if true, cuts off any currently
         *                 playing instance of THIS asset before starting the
         *                 new one, instead of overlapping. Good for dialogue.)
         */
        play(options = {}) {
            const {
                volume = 1,
                loop = defaultLoop,
                playbackRate = 1,
                loopStart,
                loopEnd,
                retrigger = false,
            } = options;

            if (retrigger) {
                // Stop whatever's currently playing for this asset first.
                // A tiny fade avoids an audible "click" from cutting the
                // waveform off mid-sample.
                const now = audioCtx.currentTime;
                const declickTime = 0.03; // 30ms
                activeSources.forEach((s) => {
                    try {
                        if (s._gainNode) {
                            s._gainNode.gain.setValueAtTime(s._gainNode.gain.value, now);
                            s._gainNode.gain.linearRampToValueAtTime(0, now + declickTime);
                        }
                        s.stop(now + declickTime);
                    } catch (e) {}
                });
                activeSources.clear();
            }

            const source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            source.loop = loop;
            source.playbackRate.value = playbackRate;

            if (loop && loopStart !== undefined) {
                source.loopStart = loopStart;
                source.loopEnd = loopEnd ?? decodedBuffer.duration;
            }

            const gainNode = audioCtx.createGain();
            gainNode.gain.value = volume;
            source._gainNode = gainNode; // referenced by retrigger logic above

            source.connect(gainNode).connect(bus);
            source.start(0);

            activeSources.add(source);
            source.onended = () => activeSources.delete(source);

            return {
                source,
                gainNode,
                stop(fadeSeconds = 0) {
                    if (fadeSeconds > 0) {
                        const now = audioCtx.currentTime;
                        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                        gainNode.gain.linearRampToValueAtTime(0, now + fadeSeconds);
                        source.stop(now + fadeSeconds);
                    } else {
                        try { source.stop(); } catch (e) {}
                    }
                },
                setVolume(v) { gainNode.gain.value = v; },
            };
        },

        stopAll() {
            activeSources.forEach((s) => {
                try { s.stop(); } catch (e) {}
            });
            activeSources.clear();
        },
    };
}

let currentMusicHandle = null;
let currentMusicId = null;

export function playMusic(id, { fadeSeconds = 0, loop = true, volume=1 } = {}) {
    if (!id) {
        stopMusic(fadeSeconds);
        return;
    }

    if ( (id === currentMusicId) && currentMusicHandle ) {
        return;
    }

    const newTrack = availableAssets.music[id];
    if (!newTrack) {
        console.error(`Music track "${id}" not found`);
        return;
    }

    if (currentMusicHandle) {currentMusicHandle.stop(fadeSeconds);}

    const handle = newTrack.play({ loop, volume: 0 });
    const now = audioCtx.currentTime;
    handle.gainNode.gain.setValueAtTime(0, now);
    handle.gainNode.gain.linearRampToValueAtTime(volume, now + fadeSeconds);

    currentMusicHandle = handle;
    currentMusicId = id;
    return handle;
}

export function stopMusic(fadeSeconds = 0) {
    if (currentMusicHandle) {
        currentMusicHandle.stop(fadeSeconds);
        currentMusicHandle = null;
        currentMusicId = null;
    }
}

export function loadAsset(type, src, id) {
    return new Promise((resolve, reject) => {
        if (type === "images") {
            // --- unchanged ---
            const img = new Image();
            img.src = src;

            img.onload = () => {
                assetCount++;
                availableAssets[type][id] = img;
                console.log(`Loaded ${id}`);
                resolve(img);
            };
            img.onerror = () => reject("Failed to load " + id);

        } else if (type === "music" || type === "sounds") {
            fetch(src)
                .then((response) => response.arrayBuffer())
                .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
                .then((decodedBuffer) => {
                    const asset = createAudioAsset(decodedBuffer, type);
                    assetCount++;
                    availableAssets[type][id] = asset;
                    console.log(`${type === "music" ? "Music" : "Audio"} loaded: ${id}`);
                    resolve(asset);
                })
                .catch(() => reject("Failed to load " + id));
        }
    });
}

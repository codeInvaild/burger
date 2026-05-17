console.log('Happy developing ✨');

let hammer = document.getElementById('hammer');

hammer.width = window.innerWidth;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
//initialize the canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


let mouse = {x : 0, y : 0};


//DOWNLOAD FUNCTION

const randomData = {
    score : 3,
    flex : 2,
    id : Math.random(),
};

const json = JSON.stringify(randomData,null,2);
const blob = new Blob([json], { type: 'application/json' });

let downloadBtn = document.getElementById("button_1");
downloadBtn.addEventListener("click", () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "save.json";
    a.click();

    URL.revokeObjectURL(url);
})

//DATA LOADING FUNCTION

const uploadBtn = document.getElementById("loadBtn");
uploadBtn.addEventListener("click", () => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const saveData = JSON.parse(reader.result);
        console.log(saveData);
    }

    reader.readAsText(file);
})

//asset preloading
function preloadImages(assetList, callback) {
    const images = {};
    let loaded = 0;
    const total = Object.keys(assetList).length;

    for (const key in assetList) {
        const img = new Image();
        img.src = assetList[key];

        img.onload = () => {
            images[key] = img;
            loaded++;

            if (loaded === total) {callback(images)}
        }
    }
}

//keyboard inputs
const keys = {};

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

class tweenService {
    x = 0;
    y = 0;

    constructor(x,y){ //constructor here serves as the parameters for setting up a new instance of this class
        this.x = x;
        this.y = y;
    }

    print() {console.log(this.x,this.y)}

    static add= (x,y) => { return x * y }
}
tweenService.add(1,2); //THIS IS A STATIC FUNCTION, SO WE MUST CALL THE ACTUAL CLASS, NOT AN INSTANCE OF IT!!!

const tw = new tweenService(6,7);
tw.print();
//tw.add(); DOES NOT WORK BECAUSE IT IS A STATIC FUNCTION!

// function update() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height); //clears the whole canvas
//
//
// }
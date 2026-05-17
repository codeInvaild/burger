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
console.log(tweenService.add(1,2)); //THIS IS A STATIC FUNCTION, SO WE MUST CALL THE ACTUAL CLASS, NOT AN INSTANCE OF IT!!!

const tw = new tweenService(6,7);
tw.print();

let prom = new Promise(function(resolve,reject){
    let success = false;
})

setTimeout(() => 0, 5000);

console.log("hi");








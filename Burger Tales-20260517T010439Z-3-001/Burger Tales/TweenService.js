class TweenInfo {
    constructor(duration, easing) {
        this.duration = duration;
        this.easing = easing;
    }
}

export const tweenService = {
    create(object, tweenInfo, goal) {
        return new Tween(object, tweenInfo, goal);
    },

    update(dt) {
        for (let i = Tween.allTweens.length - 1; i >= 0; i--) {
            const tween = Tween.allTweens[i];
            tween.update(dt); //call said tween's update function, it won't do anything if it is already done

            if (tween.finished) {//we will discard finished tweens to free up a little memory
                Tween.allTweens.splice(i, 1);
            }
        }
    },

    TweenInfo(time,easingStyle){
        if (!Tween.Easing[easingStyle]) {console.warn(easingStyle+" is not a valid style!")}
        return new TweenInfo(time,Tween.Easing[easingStyle]);
    }
};

class Tween {
    static allTweens = [];

    static Easing = { //easing styles
        Linear : t => t,//why even bother using tween service bruh 😭
        SineOut : t => Math.sin((t * Math.PI) / 2),
        SineIn : t => 1 - Math.cos((t * Math.PI) / 2),
        SineInOut : t => -(Math.cos(Math.PI * t) - 1) / 2,
        CubicOut: t => 1 - Math.pow(1 - t,3),
        CubicIn : t => Math.pow(t,3),
        CubicInOut : t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        QuintIn : t => Math.pow(t,5),
        QuintOut : t => 1 - Math.pow(1 - t,5),
        QuintInOut : t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
        CircularIn : t => 1 - Math.sqrt(1 - Math.pow(t, 2)),
        CircularOut : t => Math.sqrt(1 - Math.pow(t - 1, 2)),
        CircularInOut : t => t < 0.5 ? (1-Math.sqrt(1-Math.pow(2*t,2))) / 2 : Math.sqrt(1-Math.pow(-2*t,2)+1)/2,
        ElasticIn : t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t*10 - 10.75) * ((2 * Math.PI) / 3)),
        ElasticOut: t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2,-10 * t ) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
        ElasticInOut : t => t === 0 ? 0 : t ===1 ? 1 : t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI)/4.5))) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI)/4.5))) / 2 + 1,

    }

    constructor(object, tweenInfo, goal) {
        this.object = object; //recommended in an OBJECT data type, not an image instance, so we can easily change and access its desired properties
        this.duration = tweenInfo.duration;
        this.easing = tweenInfo.easing || Tween.Easing.Linear;

        this.elapsed = 0;//0-1 value, think of it like a lerp
        this.finished = true; //we make it true so by default, it will NOT play on creation!

        // Capture start + end values
        this.properties = {};
        for (let key in goal) {//mapping start and end values
            this.properties[key] = {
                origin: object[key],
                end: goal[key]
            };
            if (this.properties[key].origin  ===  null || !this.properties[key].end === null) { throw new Error("You have an NULL value in the tween here")}
        }

        Tween.allTweens.push(this);//giving it to our global tween holder to manage
    }

    play() {//simply resets the tween state; update loop reads as false so it "plays" the animation
        this.elapsed = 0;
        this.finished = false;
    }

    update(dt) {//what our update function calls to visually update
        if (this.finished) return;

        this.elapsed += dt;//delta time is normally a small value, we have also clamped it to 0.05 regardless
        let time = Math.min(this.elapsed / this.duration, 1);//clamp between 0-1
        time = this.easing(time); //throw our value into the easing function to get our scaled time multiplier

        for (let key in this.properties) {//we will ease toward our "to" value, doing a multiplication function
            const { origin : startValue, end : endValue } = this.properties[key];
            this.object[key] = startValue + (endValue - startValue) * time;
        }

        if (time === 1) this.finished = true
    }
}

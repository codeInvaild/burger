export class Signal {
    constructor() {
        this._connections = new Set();
    }

    connect(func) {
        this._connections.add(func);

        // Return a connection object, allowing us to disconnect at any time
        return {
            disconnect: () => {
                this._connections.delete(func);
            }
        };
    }

    fire(...args) {//Triggers the callback event
        for (const func of this._connections) {
            func(...args);
        }
    }
}


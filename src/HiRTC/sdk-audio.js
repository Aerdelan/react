class AudioLevelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._lastUpdate = currentTime;
    }

    process(inputs, outputs, parameters) {
        if (!inputs) {
            return;
        }
        if (currentTime - this._lastUpdate >= 0.1) {
            if (!inputs[0] || !inputs[0][0]) {
                //console.log('@@');
                return;
            }
            //auconsole.log('@@',inputs[0][0]);
            const buffer = inputs[0][0];
            let max = Math.floor(Math.max.apply(Math, buffer) * 100);
            if (max < 0) {
                max = -max;
            }
            this.port.postMessage({audioLevel: max});
            this._lastUpdate = currentTime;
        }
        return true;
    }
}

registerProcessor('audioLevel', AudioLevelProcessor);
class ZzfxmProcessor extends AudioWorkletProcessor {

    constructor() {
        super();

        this.left = null;
        this.right = null;
        this.index = 0;
        this.playing = false;

        this.port.onmessage = (e) => {
            const data = e.data;

            if (data.type === "load") {
                this.left = data.left;
                this.right = data.right;
                this.index = 0;
                this.playing = true;
            }

            if (data.type === "stop") {
                this.playing = false;
            }
        };
    }

    process(inputs, outputs) {

        const output = outputs[0];
        const leftOut = output[0];
        const rightOut = output[1] || output[0];

        if (!this.playing || !this.left) {
            leftOut.fill(0);
            rightOut.fill(0);
            return true;
        }

        for (let i = 0; i < leftOut.length; i++) {

            if (this.index >= this.left.length) {
                this.playing = false;

                // notify main thread
                this.port.postMessage({ type: "ended" });
                break;
            }

            leftOut[i] = this.left[this.index] || 0;
            rightOut[i] = this.right[this.index] || 0;

            this.index++;
        }

        return true;
    }
}

registerProcessor("zzfxm-processor", ZzfxmProcessor);

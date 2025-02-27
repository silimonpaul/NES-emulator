// Define AudioWorkletProcessor if not available
if (typeof AudioWorkletProcessor === "undefined") {
  class AudioWorkletProcessor {
    constructor() {
      this.port = null;
    }
  }
  globalThis.AudioWorkletProcessor = AudioWorkletProcessor;
}

// Define registerProcessor if not available
if (typeof registerProcessor === "undefined") {
  globalThis.registerProcessor = (name, processorCtor) => {};
}

class NESAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleBuffer = new Float32Array(16384);
    this.writeIndex = 0;
    this.readIndex = 0;

    this.port.onmessage = (e) => {
      const samples = e.data.samples;
      for (let i = 0; i < samples.length; i++) {
        this.sampleBuffer[this.writeIndex] = samples[i];
        this.writeIndex = (this.writeIndex + 1) % this.sampleBuffer.length;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0][0];

    for (let i = 0; i < output.length; i++) {
      if (this.readIndex === this.writeIndex) {
        output[i] = 0;
        continue;
      }
      output[i] = this.sampleBuffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.sampleBuffer.length;
    }

    return true;
  }
}

registerProcessor("nes-audio-processor", NESAudioProcessor);

class AudioHandler {
  constructor() {
    this.hasAudio = true;
    const Ac = window.AudioContext || window.webkitAudioContext;
    this.sampleBuffer = new Float32Array(735);
    this.samplesPerFrame = 735;

    if (Ac === undefined) {
      log("Audio disabled: no Web Audio API support");
      this.hasAudio = false;
      return;
    }

    try {
      this.actx = new Ac({
        latencyHint: "interactive",
        sampleRate: 44100,
      });

      const samples = this.actx.sampleRate / 60;
      this.sampleBuffer = new Float32Array(samples);
      this.samplesPerFrame = samples;

      // Modern audio worklet setup
      this.setupAudioWorklet();

      // Audio graph setup
      this.gainNode = this.actx.createGain();
      this.gainNode.gain.value = 0.5;

      // Modern dynamics processing
      this.limiter = this.actx.createDynamicsCompressor();
      this.limiter.threshold.value = -0.5;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20.0;
      this.limiter.attack.value = 0.005;
      this.limiter.release.value = 0.05;

      this.gainNode.connect(this.limiter);
      this.limiter.connect(this.actx.destination);

      log("Audio initialized, sample rate: " + this.actx.sampleRate);
    } catch (e) {
      log("Audio initialization failed: " + e.message);
      this.hasAudio = false;
    }
  }

  async setupAudioWorklet() {
    try {
      await this.actx.audioWorklet.addModule("js/audio-worklet.js");
      this.audioNode = new AudioWorkletNode(this.actx, "nes-audio-processor", {
        outputChannelCount: [1],
        processorOptions: {
          sampleRate: this.actx.sampleRate,
        },
      });
      this.audioNode.connect(this.gainNode);
    } catch (e) {
      log("AudioWorklet setup failed, falling back to ScriptProcessor");
      this.setupScriptProcessor();
    }
  }

  setupScriptProcessor() {
    this.inputBuffer = new Float32Array(16384);
    this.inputBufferPos = 0;
    this.inputReadPos = 0;

    this.scriptNode = this.actx.createScriptProcessor(2048, 0, 1);
    this.scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      const bufferSize = this.inputBuffer.length;

      for (let i = 0; i < output.length; i++) {
        if (this.inputReadPos >= this.inputBufferPos) {
          output[i] = 0;
          continue;
        }
        output[i] = this.inputBuffer[this.inputReadPos % bufferSize];
        this.inputReadPos++;
      }
    };
    this.scriptNode.connect(this.gainNode);
  }

  async resume() {
    if (!this.hasAudio) return;
    try {
      await this.actx.resume();
    } catch (e) {
      log("Error resuming audio: " + e.message);
    }
  }

  start() {
    if (!this.hasAudio) return;
    this.resume();
  }

  stop() {
    if (!this.hasAudio) return;
    if (this.scriptNode) {
      this.scriptNode.disconnect();
    }
    if (this.audioNode) {
      this.audioNode.disconnect();
    }
    this.setVolume(0);
  }

  setVolume(value) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, value)),
        this.actx.currentTime
      );
    }
  }

  nextBuffer() {
    if (!this.hasAudio) return;

    if (this.audioNode) {
      this.audioNode.port.postMessage({
        samples: this.sampleBuffer,
      });
    } else if (this.scriptNode) {
      const bufferSize = this.inputBuffer.length;
      for (let i = 0; i < this.samplesPerFrame; i++) {
        this.inputBuffer[this.inputBufferPos % bufferSize] =
          this.sampleBuffer[i];
        this.inputBufferPos++;
      }
    }
  }
}

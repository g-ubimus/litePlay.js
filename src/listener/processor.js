class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = (options && options.processorOptions) || {};

    // Onset/offset detection runs every 128 samples
    // Pitch detection still needs a larger window
    this.onsetThreshold = opts.onsetThreshold ?? 0.05;
    this.pitchBufferSize = opts.pitchBufferSize ?? 4096;

    this.offsetHoldSeconds = (opts.offsetHoldMs ?? 30) / 1000;

    this.pitchBuffer = new Float32Array(this.pitchBufferSize);
    this.pitchPointer = 0;
    this.isSounding = false;
    this.belowThresholdSince = null; // null while above threshold
  }

  computeRms(channelData) {
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    return Math.sqrt(sumSquares / channelData.length);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    const rms = this.computeRms(channelData);
    const aboveThreshold = rms > this.onsetThreshold;

    if (aboveThreshold) {
      // Sound is present — cancel any pending offset confirmation.
      this.belowThresholdSince = null;

      if (!this.isSounding) {
        this.isSounding = true;
        this.pitchPointer = 0; // start a fresh pitch window for this note
        this.port.postMessage({ type: "onset", time: currentTime });
      }
    } else if (this.isSounding) {
      if (this.belowThresholdSince === null) {
        this.belowThresholdSince = currentTime;
      } else if (
        currentTime - this.belowThresholdSince >=
        this.offsetHoldSeconds
      ) {
        this.isSounding = false;
        this.port.postMessage({
          type: "offset",
          time: this.belowThresholdSince,
        });
        this.belowThresholdSince = null;
      }
    }

    if (this.isSounding) {
      this.port.postMessage({ type: "rms", rms });

      for (let i = 0; i < channelData.length; i++) {
        this.pitchBuffer[this.pitchPointer++] = channelData[i];
        if (this.pitchPointer >= this.pitchBufferSize) {
          this.port.postMessage({
            type: "pitchFrame",
            data: this.pitchBuffer.slice(),
          });
          this.pitchPointer = 0;
        }
      }
    }

    // keep the processor alive in the background
    return true;
  }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);

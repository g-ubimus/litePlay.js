import Essentia from "https://unpkg.com/essentia.js@0.1.3/dist/essentia.js-core.es.min.js";
import { EssentiaWASM } from "https://unpkg.com/essentia.js@0.1.3/dist/essentia-wasm.es.js";

// System Variables
let essentia = null;
let isListening = false;
let workletNode = null;
let micSource = null;
let phraseCheckIntervalId = null;

// Analysis State
let isSounding = false;
const onsetThreshold = 0.05;
const durationThreshold = 0.02;
const offsetHoldMs = 30; // Minimum time RMS must stay below onsetThreshold before a note-offset is confirmed
let eventOnset = 0;
let phraseOnset = 0;
let framePitches = [];
let frameLoudness = [];
let currentPhrase = [];
let lastNoteEndTime = 0;
let recentPauses = [];
let silenceThreshold = 0.5;

// Global Exposes
window.allEvents = [];
window.lastEvent = [];
window.lastMelody = [];
window.lastRhythm = [];
window.lastOnsetTimes = [];
window.lastAmps = [];
window.lastPhrase = [];

// Toggles the machine listening state
export async function toggleListening(audioCtx, onEventDetected) {
  if (!essentia) essentia = new Essentia(EssentiaWASM);

  try {
    // Define worklet
    await audioCtx.audioWorklet.addModule("./src/listener/processor.js");

    // Ask for audio input
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    micSource = audioCtx.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(audioCtx, "audio-capture-processor", {
      processorOptions: { onsetThreshold, offsetHoldMs },
    });

    workletNode.port.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case "onset":
          triggerNoteOn(msg.time);
          break;
        case "offset":
          triggerNoteOff(msg.time, onEventDetected);
          break;
        case "rms":
          frameLoudness.push(msg.rms);
          break;
        case "pitchFrame":
          extractPitch(msg.data);
          break;
      }
    };

    micSource.connect(workletNode);
    isListening = true;

    phraseCheckIntervalId = setInterval(() => {
      if (!isSounding) checkPhraseCompletion(audioCtx.currentTime);
    }, 100);

    return true;
  } catch (err) {
    console.error("Machine Listening error:", err);
    return false;
  }
}

// Sub-Routines
function triggerNoteOn(currentTime) {
  isSounding = true;
  eventOnset = currentTime;

  if (lastNoteEndTime > 0) {
    updateSilenceThreshold(currentTime);
  }
  if (currentPhrase.length === 0) {
    phraseOnset = eventOnset;
  }

  framePitches = [];
  frameLoudness = [];
}

function triggerNoteOff(currentTime, onEventDetected) {
  isSounding = false;
  const duration = currentTime - eventOnset;

  if (duration > durationThreshold) {
    const relativeOnsetTime = eventOnset - phraseOnset;
    const eventData = processEventData(
      framePitches,
      frameLoudness,
      relativeOnsetTime,
      duration,
    );

    saveEventData(eventData);

    if (onEventDetected) onEventDetected(eventData);
  }

  lastNoteEndTime = currentTime;
}

function extractPitch(rawData) {
  const vectorData = essentia.arrayToVector(rawData);
  const spectrum = essentia.Spectrum(vectorData).spectrum;
  const pitchInfo = essentia.PitchYinFFT(spectrum);

  if (pitchInfo.pitchConfidence > 0.8) {
    framePitches.push(pitchInfo.pitch);
  }
}

function updateSilenceThreshold(currentTime) {
  const pauseDuration = currentTime - lastNoteEndTime;
  recentPauses.push(pauseDuration);

  if (recentPauses.length > 10) recentPauses.shift();

  const avgPause =
    recentPauses.reduce((a, b) => a + b, 0) / recentPauses.length;
  silenceThreshold = Math.max(0.5, Math.min(avgPause * 1.5, 2));
}

function checkPhraseCompletion(currentTime) {
  if (currentPhrase.length === 0 || lastNoteEndTime === 0) return;

  const timeSinceLastNote = currentTime - lastNoteEndTime;
  if (timeSinceLastNote > silenceThreshold) {
    finalizePhrase();
  }
}

function finalizePhrase() {
  window.lastMelody = currentPhrase.map((event) => event[0]);
  window.lastAmps = currentPhrase.map((event) => event[1]);
  window.lastOnsetTimes = currentPhrase.map((event) => event[2]);
  window.lastRhythm = currentPhrase.map((event) => event[3]);
  window.lastPhrase = [...currentPhrase];

  currentPhrase = [];

  const mlConsole = document.getElementById("ml-console");
  if (mlConsole) {
    const logText = `> Phrase grouped: ${window.lastMelody.length} events. (Threshold: ${silenceThreshold.toFixed(2)}s)\n`;
    const arrayText =
      `Melody: ${JSON.stringify(window.lastMelody)}\n` +
      `Amps:   ${JSON.stringify(window.lastAmps)}\n` +
      `Rhythm: ${JSON.stringify(window.lastRhythm)}\n\n`;
    mlConsole.value += logText + arrayText;
    mlConsole.scrollTop = mlConsole.scrollHeight;
  }
}

function saveEventData(eventData) {
  window.lastEvent = eventData;
  window.lastPitch = eventData[0];
  window.lastLoudness = eventData[1];
  window.lastOnsetTime = eventData[2];
  window.lastDur = eventData[3];

  window.allEvents.push(eventData);
  currentPhrase.push(eventData);
}

const normAmp = (loudnesses) => {
  if (!loudnesses || loudnesses.length === 0) return 0;
  const peakRms = Math.max(...loudnesses);
  if (peakRms <= 0) return 0;
  const db = 20 * Math.log10(peakRms);
  const minDb = -50; // Noise floor becomes 0.0
  const maxDb = -10; // Maximum instrument volume becomes 1.0
  const normalized = (db - minDb) / (maxDb - minDb);
  return Math.max(0, Math.min(1, normalized));
};

function processEventData(pitches, loudnesses, onsetTime, duration) {
  const avgLoudness = normAmp(loudnesses);
  let avgPitchHz = 0;
  let midiValue = 0;

  if (pitches.length > 0) {
    avgPitchHz = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    midiValue = parseFloat((69 + 12 * Math.log2(avgPitchHz / 440)).toFixed(2));
  }

  return [
    midiValue,
    parseFloat(avgLoudness.toFixed(2)),
    parseFloat(onsetTime.toFixed(3)),
    parseFloat(duration.toFixed(3)),
  ];
}

function stopListening() {
  if (workletNode && micSource) {
    micSource.disconnect();
    workletNode.disconnect();
    workletNode = null;
    micSource = null;
  }
  if (phraseCheckIntervalId) {
    clearInterval(phraseCheckIntervalId);
    phraseCheckIntervalId = null;
  }
  isListening = false;
}

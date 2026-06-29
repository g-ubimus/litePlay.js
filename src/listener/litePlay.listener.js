import { csound } from "../core/litePlay.js";

// System state
let isListening = false;
let analysisInstrStarted = false;
let isSounding = false;
const durationThreshold = 0.02;
let eventOnset = 0;
let phraseOnset = 0;
let framePitches = [];
let frameLoudness = [];
let currentPhrase = [];
let lastNoteEndTime = 0;
let recentPauses = [];
let silenceThreshold = 1.5;
let pollIntervalId = null;
let phraseCheckIntervalId = null;

// Csound channel tracking
let lastOnsetTrig = 0;
let lastOffsetTrig = 0;

// Global exposes
window.allEvents = [];
window.lastEvent = [];
window.lastMelody = [];
window.lastRhythm = [];
window.lastOnsetTimes = [];
window.lastAmps = [];
window.lastPhrase = [];

let micStream = null;

export async function toggleListening(audioCtx, arg2, arg3) {
  let onEventDetected = null;
  let options = {};

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    options = arg2;
    if (typeof arg3 === "function") onEventDetected = arg3;
  } else {
    if (typeof arg2 === "function") onEventDetected = arg2;
    if (typeof arg3 === "object" && arg3 !== null && !Array.isArray(arg3))
      options = arg3;
  }

  const {
    fastAtt = 0.01,
    fastRel = 0.05,
    slowAtt = 0.1,
    slowRel = 0.3,
    thresh = 0.005,
    noiseFloor = 0.002,
    holdTime = 0.05,
  } = options;

  if (!csound) {
    console.error("Csound engine not ready. Start litePlay first.");
    return false;
  }

  // Update parameters even if already listening
  csound.setControlChannel("listenerFastAtt", fastAtt);
  csound.setControlChannel("listenerFastRel", fastRel);
  csound.setControlChannel("listenerSlowAtt", slowAtt);
  csound.setControlChannel("listenerSlowRel", slowRel);
  csound.setControlChannel("listenerThresh", thresh);
  csound.setControlChannel("listenerNoiseFloor", noiseFloor);
  csound.setControlChannel("listenerHoldTime", holdTime);

  if (isListening) return true;

  try {
    if (!analysisInstrStarted) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      await csound.enableAudioInput(stream);
      micStream = stream;
      csound.inputMessage("i 99 0 -1");
      analysisInstrStarted = true;
    }

    isListening = true;
    lastOnsetTrig = 0;
    lastOffsetTrig = 0;

    pollIntervalId = setInterval(() => {
      pollListener(onEventDetected);
    }, 10);
    phraseCheckIntervalId = setInterval(() => {
      if (!isSounding) checkPhraseCompletion(performance.now() / 1000);
    }, 100);

    return true;
  } catch (err) {
    console.error("Csound listener error:", err);
    return false;
  }
}

let debugTick = 0;

async function pollListener(onEventDetected) {
  const rms = await csound.getControlChannel("listenerRms");

  const onsetTrig = await csound.getControlChannel("listenerOnsetTrig");
  if (onsetTrig > lastOnsetTrig) {
    lastOnsetTrig = onsetTrig;
    const onsetTime = await csound.getControlChannel("listenerOnsetTime");
    triggerNoteOn(onsetTime);
  }

  const offsetTrig = await csound.getControlChannel("listenerOffsetTrig");
  if (offsetTrig > lastOffsetTrig) {
    lastOffsetTrig = offsetTrig;
    const offsetTime = await csound.getControlChannel("listenerOffsetTime");
    triggerNoteOff(offsetTime, onEventDetected);
  }

  if (isSounding) {
    frameLoudness.push(rms);
    const pitch = await csound.getControlChannel("listenerPitch");
    if (pitch > 20) framePitches.push(pitch);
  }
}

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

    // Log individual note to ML console immediately
    const mlConsole = document.getElementById("ml-console");
    if (mlConsole) {
      mlConsole.value += `{what: ${eventData[0]}, howLoud: ${eventData[1]}, when: ${eventData[2]}, howLong: ${eventData[3]}\n`;
      mlConsole.scrollTop = mlConsole.scrollHeight;
    }
  }

  lastNoteEndTime = currentTime;
}

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

const normAmp = (loudnesses) => {
  if (!loudnesses || loudnesses.length === 0) return 0;
  const peakRms = Math.max(...loudnesses);
  if (peakRms <= 0) return 0;
  const db = 20 * Math.log10(peakRms);
  const minDb = -50;
  const maxDb = -10;
  const normalized = (db - minDb) / (maxDb - minDb);
  return Math.max(0, Math.min(1, normalized));
};

function saveEventData(eventData) {
  window.lastEvent = eventData;
  window.lastPitch = eventData[0];
  window.lastLoudness = eventData[1];
  window.lastOnsetTime = eventData[2];
  window.lastDur = eventData[3];

  window.allEvents.push(eventData);
  currentPhrase.push(eventData);
}

function updateSilenceThreshold(currentTime) {
  const pauseDuration = currentTime - lastNoteEndTime;
  recentPauses.push(pauseDuration);

  if (recentPauses.length > 10) recentPauses.shift();

  const avgPause =
    recentPauses.reduce((a, b) => a + b, 0) / recentPauses.length;
  silenceThreshold = Math.max(1.0, Math.min(avgPause * 1.5, 3));
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
    const logText = `Phrase: ${window.lastMelody.length} events.\n`;
    const arrayText =
      `lastMelody: ${JSON.stringify(window.lastMelody)}\n` +
      `lastAmps:   ${JSON.stringify(window.lastAmps)}\n` +
      `lastWhen: ${JSON.stringify(window.lastOnsetTimes)}\n\n`;
    `lastRhythm: ${JSON.stringify(window.lastRhythm)}\n\n`;
    mlConsole.value += logText + arrayText;
    mlConsole.scrollTop = mlConsole.scrollHeight;
  }
}

export function stopListening() {
  if (analysisInstrStarted) {
    csound.inputMessage("i -99 0 0.1");
    analysisInstrStarted = false;
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  if (phraseCheckIntervalId) {
    clearInterval(phraseCheckIntervalId);
    phraseCheckIntervalId = null;
  }
  isListening = false;
  isSounding = false;
}

// Portuguese aliases
export const ativarEscuta = toggleListening;
export const pararEscuta = stopListening;

import { csound } from "../core/litePlay.js";

const ANALYSIS_ORC = `
instr 99
  ain ins
  krms rms ain
  chnset krms, "listenerRms"
  konset init 0
  kbelow init 0
  kthresh = 0.05
  khold = int(30 * kr / 1000)
  kOnsetTrig init 0
  kOffTrig init 0
  if krms > kthresh then
    kbelow = 0
    if konset == 0 then
      konset = 1
      kOnsetTrig = kOnsetTrig + 1
      chnset kOnsetTrig, "listenerOnsetTrig"
      chnset timeinsts(), "listenerOnsetTime"
    endif
  else
    kbelow = kbelow + 1
    if konset == 1 && kbelow > khold then
      konset = 0
      kOffTrig = kOffTrig + 1
      chnset kOffTrig, "listenerOffsetTrig"
      chnset timeinsts(), "listenerOffsetTime"
    endif
  endif
  if konset == 1 then
    kfreq, kamp pitch ain, 50, 60, 2000
    chnset kfreq, "listenerPitch"
  endif
endin
`;

// System state
let isListening = false;
let analysisInstrStarted = false;
let isSounding = false;
const onsetThreshold = 0.05;
const durationThreshold = 0.02;
let eventOnset = 0;
let phraseOnset = 0;
let framePitches = [];
let frameLoudness = [];
let currentPhrase = [];
let lastNoteEndTime = 0;
let recentPauses = [];
let silenceThreshold = 0.5;
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

export async function toggleListening(audioCtx, onEventDetected) {
  if (!csound) {
    console.error("Csound engine not ready. Start litePlay first.");
    return false;
  }
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
      await csound.compileOrc(ANALYSIS_ORC);
      csound.inputMessage("i 99 0 -1");
      analysisInstrStarted = true;
    }

    isListening = true;
    lastOnsetTrig = 0;
    lastOffsetTrig = 0;

    pollIntervalId = setInterval(() => pollListener(onEventDetected), 10);
    phraseCheckIntervalId = setInterval(() => {
      if (!isSounding) checkPhraseCompletion(performance.now() / 1000);
    }, 100);

    return true;
  } catch (err) {
    console.error("Csound listener error:", err);
    return false;
  }
}

function pollListener(onEventDetected) {
  const onsetTrig = csound.getControlChannel("listenerOnsetTrig");
  if (onsetTrig > lastOnsetTrig) {
    lastOnsetTrig = onsetTrig;
    triggerNoteOn(csound.getControlChannel("listenerOnsetTime"));
  }

  const offsetTrig = csound.getControlChannel("listenerOffsetTrig");
  if (offsetTrig > lastOffsetTrig) {
    lastOffsetTrig = offsetTrig;
    triggerNoteOff(
      csound.getControlChannel("listenerOffsetTime"),
      onEventDetected,
    );
  }

  if (isSounding) {
    frameLoudness.push(csound.getControlChannel("listenerRms"));

    const pitch = csound.getControlChannel("listenerPitch");
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
    const logText =
      `> Phrase grouped: ${window.lastMelody.length} events. (Threshold: ${silenceThreshold.toFixed(2)}s)\n`;
    const arrayText =
      `Melody: ${JSON.stringify(window.lastMelody)}\n` +
      `Amps:   ${JSON.stringify(window.lastAmps)}\n` +
      `Rhythm: ${JSON.stringify(window.lastRhythm)}\n\n`;
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
export const alternarEscuta = toggleListening;
export const pararEscuta = stopListening;

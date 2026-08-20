import { midPitch, choose, rnd, rndInt, eventList } from "./litePlay.js";

function resolveEvent(input) {
  const parseInstr = (inst) => {
    let target = inst ?? (window.piano || 1);
    if (
      target &&
      typeof target === "object" &&
      typeof target.instr === "object" &&
      target.instr !== null
    ) {
      return target.instr;
    }

    return target;
  };

  if (typeof input === "object" && input !== null && !Array.isArray(input)) {
    return [
      input.what ?? input.oque ?? input.oQue ?? 60,
      input.howLoud ?? input.quãoForte ?? input.intensidade ?? 0.8,
      input.when ?? input.quando ?? 0,
      input.howLong ?? input.quãoLongo ?? input.duração ?? 1,
      parseInstr(input.onSomething ?? input.noQue),
    ];
  }

  if (typeof input === "number") {
    return [input, 1, 0, 1, parseInstr(null)];
  }

  if (Array.isArray(input) && input.length > 0) {
    return [
      input[0] ?? 60,
      input[1] ?? 0.8,
      input[2] ?? 0,
      input[3] ?? 1,
      parseInstr(input[4]),
    ];
  }

  return [60, 0.8, 0, 1, parseInstr(null)];
}

export function midiToName(midiValue) {
  if (midiValue < 0 || midiValue > 127)
    throw new RangeError(
      `midiToName: value ${midiValue} is out of bounds (0-127).`,
    );
  const pitchClasses = [
    "C",
    "Cs",
    "D",
    "Eb",
    "E",
    "F",
    "Fs",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  let pitch = pitchClasses[midiValue % 12];
  let octave = Math.floor(midiValue / 12) - 1;
  let octaveName = octave === -1 ? "-1" : octave;
  let name = pitch + octaveName;
  return name;
}

export function transpose(notes = [], interval = 0) {
  if (!Array.isArray(notes)) {
    throw new TypeError("transpose(): first argument must be an array.");
  }
  return notes.map((i) => i + interval);
}

export function edo(divisions) {
  if (divisions <= 0) {
    throw new RangeError("edo(): divisions must be a positive number.");
  }
  const octave = 12;
  let integer = Math.floor(divisions);
  const interval = 12 / integer;
  let tones = [0];
  for (let i = 0, len = octave; i < len; i = i + interval) {
    tones.push(i + interval);
  }
  return tones;
}

export function midiToFrequency(midi) {
  if (midi <= 0) {
    throw new RangeError("midiToFrequency(): midi must be a positive number.");
  }
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq) {
  if (freq <= 0) {
    throw new RangeError(
      "frequencyToMidi(): frequency must be a positive number.",
    );
  }
  return 69 + 12 * Math.log2(freq / 440);
}

export function justIntonation(baseNote = C4, size = 14) {
  const baseFreq = midiToFrequency(baseNote);
  let tones = [];
  for (let i = 1, len = size + 1; i < len; i++) {
    let nextHarmonic = i * baseFreq;
    tones.push(nextHarmonic);
  }
  let output = tones.map(
    (i) => ((frequencyToMidi(i) - baseNote) % 12) + baseNote,
  );
  output.push(baseNote + 12);
  output = output.map((i) => Number(i.toFixed(3)));
  return Array.from(new Set(output)).sort((a, b) => a - b);
}

export function monotone(initialTone = C4, interval = 1) {
  if (interval === Math.trunc(interval)) {
    return choose(
      initialTone,
      rndInt(initialTone - interval, initialTone + interval + 1),
    );
  } else {
    let output = choose(
      initialTone,
      rnd(initialTone - interval, initialTone + interval + 1),
    );
    output = Number(output.toFixed(3));
    return output;
  }
}

export function randomChord(arg1, arg2, arg3) {
  let size = 4;
  let range = midPitch;
  let microtonal = false;

  if (typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    size = arg1.size ?? size;
    range = arg1.range ?? range;
    microtonal = arg1.microtonal ?? microtonal;
  } else {
    if (arg1 !== undefined) size = arg1;
    if (arg2 !== undefined) range = arg2;
    if (arg3 !== undefined) microtonal = arg3;
  }
  if (size < 1) {
    throw new RangeError(`randomChord(): size (${size}) must be at least 1.`);
  }
  let notes = new Set();
  let maxAttempts = range != midPitch ? 36 : 24;

  let attempts = 0;
  let getPitch;

  while (notes.size < size && attempts < maxAttempts) {
    if (microtonal === false) {
      getPitch = Math.round(range());
    } else {
      getPitch = range();
    }
    notes.add(getPitch);
    attempts++;
  }

  return Array.from(notes).sort((a, b) => a - b);
}

export function blockChord(eventInput, arg2) {
  let chord = randomChord();
  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    chord = arg2.chord ?? chord;
  } else {
    if (arg2 !== undefined) chord = arg2;
  }
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  let l = eventList.create();
  for (let i of chord) {
    l.add([i, howLoud, resolvedWhen, resolvedHowLong, onSomething]);
  }
  return l;
}

export function arpeggio(eventInput, arg2, arg3, arg4) {
  let noteList = randomChord();
  let repetitions = 1;
  let direction = "backAndForth";
  let l = eventList.create();

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    noteList = arg2.noteList ?? noteList;
    repetitions = arg2.repetitions ?? repetitions;
    direction = arg2.direction ?? direction;
  } else {
    if (arg2 !== undefined) noteList = arg2;
    if (arg3 !== undefined) repetitions = arg3;
    if (arg4 !== undefined) direction = arg4;
  }
  if (repetitions < 1) {
    throw new RangeError(
      `arpeggio(): repetitions (${repetitions}) must be at least 1.`,
    );
  }

  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  let currentTime = resolvedWhen;
  let notesToPlay = [];

  if (direction === "forward" || direction === "normal") {
    notesToPlay = [...noteList];
  } else if (direction === "backward" || direction === "inversa") {
    notesToPlay = [...noteList].reverse();
  } else if (
    direction === "backAndForth" ||
    direction === "bidirectional" ||
    direction === "vaiVolta"
  ) {
    const downNotes = [...noteList].reverse().slice(1, -1);
    notesToPlay = [...noteList, ...downNotes];
  } else {
    throw new RangeError(
      `arpeggio(): direction "${direction}" is not valid. Use "forward", "backward", or "backAndForth".`,
    );
  }

  for (let i = 0; i < repetitions; i++) {
    for (let note of notesToPlay) {
      l.add([note, howLoud, currentTime, resolvedHowLong, onSomething]);
      currentTime += resolvedHowLong;
    }
  }
  return l;
}

export function intervalSequence(eventInput, arg2, arg3, arg4) {
  let interval = rndInt(1, 11);
  let repetitions = 5;
  let direction = choose("up", "down");
  let l = eventList.create();

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    interval = arg2.interval ?? interval;
    repetitions = arg2.repetitions ?? repetitions;
    direction = arg2.direction ?? direction;
  } else {
    if (arg2 !== undefined) interval = arg2;
    if (arg3 !== undefined) repetitions = arg3;
    if (arg4 !== undefined) direction = arg4;
  }

  const [note, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  l.add([note, howLoud, resolvedWhen, resolvedHowLong, onSomething]);
  let currentPitch = note;
  let currentWhen = resolvedWhen;

  if (!repetitions) {
    return l;
  } else {
    for (let i = 0; i < repetitions; i++) {
      if (direction === "up") {
        currentPitch += interval;
      } else if (direction === "down") {
        currentPitch -= interval;
      } else {
        throw new RangeError(
          `intervalSequence(): direction "${direction}" is not valid. Use "up" or "down".`,
        );
      }
      currentWhen += resolvedHowLong;
      l.add([currentPitch, howLoud, currentWhen, resolvedHowLong, onSomething]);
    }
    return l;
  }
}

export function invert(melody = [], axis = C4) {
  if (!Array.isArray(melody)) {
    throw new TypeError("invert(): first argument must be an array.");
  }
  return melody.map((note) => axis + ((((axis - note) % 12) + 12) % 12));
}

export function faster(eventInput, arg2, arg3) {
  let lastDuration = 0.1;
  let steps = 1;

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    lastDuration = arg2.lastDuration ?? lastDuration;
    steps = arg2.steps ?? steps;
  } else {
    if (arg2 !== undefined) lastDuration = arg2;
    if (arg3 !== undefined) steps = arg3;
  }

  if (steps <= 0) {
    throw new RangeError(
      `faster(): steps (${steps}) must be a positive number.`,
    );
  }

  const [, , , howLong] = resolveEvent(eventInput);
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  if (lastDuration >= resolvedHowLong) {
    throw new RangeError(
      `faster(): lastDuration (${lastDuration}) must be less than the event duration (${resolvedHowLong}) to make it faster.`,
    );
  }

  return changeTempo(eventInput, lastDuration, steps);
}

export function slower(eventInput, arg2, arg3) {
  let lastDuration = 2;
  let steps = 1;

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    lastDuration = arg2.lastDuration ?? lastDuration;
    steps = arg2.steps ?? steps;
  } else {
    if (arg2 !== undefined) lastDuration = arg2;
    if (arg3 !== undefined) steps = arg3;
  }

  if (steps <= 0) {
    throw new RangeError(
      `slower(): steps (${steps}) must be a positive number.`,
    );
  }

  const [, , , howLong] = resolveEvent(eventInput);
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  if (lastDuration <= resolvedHowLong) {
    throw new RangeError(
      `slower(): lastDuration (${lastDuration}) must be greater than the event duration (${resolvedHowLong}) to make it slower.`,
    );
  }

  return changeTempo(eventInput, lastDuration, steps);
}

function changeTempo(eventInput, lastDuration = 1, steps = 10) {
  if (steps <= 0) {
    throw new RangeError(
      `changeTempo(): steps (${steps}) must be a positive number.`,
    );
  }
  let l = eventList.create();
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  l.add([what, howLoud, resolvedWhen, resolvedHowLong, onSomething]);
  let nextDuration = resolvedHowLong;
  let nextWhen = resolvedWhen;
  let diff = resolvedHowLong - lastDuration;
  let stepSize = diff / steps;

  for (let i = 0; i < steps; i++) {
    nextDuration -= stepSize;
    nextWhen += nextDuration;
    let currentEvent = [what, howLoud, nextWhen, nextDuration, onSomething];
    l.add(currentEvent);
  }
  return l;
}

export function louder(eventInput, arg2, arg3) {
  let lastAmp = 1;
  let steps = 1;
  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    lastAmp = arg2.lastAmp ?? lastAmp;
    steps = arg2.steps ?? steps;
  } else {
    if (arg2 !== undefined) lastAmp = arg2;
    if (arg3 !== undefined) steps = arg3;
  }

  if (steps <= 0) {
    throw new RangeError(
      `louder(): steps (${steps}) must be a positive number.`,
    );
  }

  if (lastAmp < 0 || lastAmp > 1) {
    throw new RangeError(
      `louder(): lastAmp (${lastAmp}) must be between 0 and 1.`,
    );
  }

  const [, howLoud] = resolveEvent(eventInput);
  if (lastAmp <= howLoud) {
    throw new RangeError(
      `louder(): lastAmp (${lastAmp}) must be greater than the event amplitude (${howLoud}) to make it louder.`,
    );
  }

  return changeLoudness(eventInput, lastAmp, steps);
}

export function softer(eventInput, arg2, arg3) {
  let lastAmp = 0.1;
  let steps = 1;
  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    lastAmp = arg2.lastAmp ?? lastAmp;
    steps = arg2.steps ?? steps;
  } else {
    if (arg2 !== undefined) lastAmp = arg2;
    if (arg3 !== undefined) steps = arg3;
  }

  if (steps <= 0) {
    throw new RangeError(
      `softer(): steps (${steps}) must be a positive number.`,
    );
  }

  if (lastAmp < 0 || lastAmp > 1) {
    throw new RangeError(
      `softer(): lastAmp (${lastAmp}) must be between 0 and 1.`,
    );
  }

  const [, howLoud] = resolveEvent(eventInput);
  if (lastAmp >= howLoud) {
    throw new RangeError(
      `softer(): lastAmp (${lastAmp}) must be less than the event amplitude (${howLoud}) to make it softer.`,
    );
  }

  return changeLoudness(eventInput, lastAmp, steps);
}

function changeLoudness(eventInput, last = 1, steps = 10) {
  if (steps <= 0) {
    throw new RangeError(
      `changeLoudness(): steps (${steps}) must be a positive number.`,
    );
  }
  let l = eventList.create();
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  l.add([what, howLoud, resolvedWhen, resolvedHowLong, onSomething]);

  const ampStep = (last - howLoud) / steps;

  let nextWhen = resolvedWhen;
  let nextLoudness = howLoud;
  for (let i = 0; i < steps; i++) {
    nextWhen += resolvedHowLong;
    nextLoudness += ampStep;
    nextLoudness = Math.round(nextLoudness * 1000) / 1000;
    l.add([what, nextLoudness, nextWhen, resolvedHowLong, onSomething]);
  }
  return l;
}

export function retrograde(list) {
  if (!Array.isArray(list)) {
    throw new TypeError("retrograde(): argument must be an array.");
  }
  return list.reverse();
}

export function rotate(list, steps = 1) {
  if (!Array.isArray(list)) {
    throw new TypeError("rotate(): first argument must be an array.");
  }
  return list.map((note, index, arr) => {
    let newIndex = (index + steps) % arr.length;
    if (newIndex < 0) newIndex += arr.length;
    return arr[newIndex];
  });
}

export function ostinato(eventInput, arg2, arg3) {
  let repetitions = 1;
  let rhythm;
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    repetitions = arg2.repetitions ?? repetitions;
    rhythm = arg2.rhythm ?? rhythm;
  } else {
    if (arg2 !== undefined) repetitions = arg2;
    if (arg3 !== undefined) rhythm = arg3;
  }

  const durations = rhythm || [resolvedHowLong];
  const resolvePitch = (val) => (typeof val === "function" ? val() : val);
  const firstPitch = resolvePitch(what);
  let l = eventList.create([
    what,
    howLoud,
    resolvedWhen,
    resolvedHowLong,
    onSomething,
  ]);
  let initialTime = resolvedWhen;

  for (let i = 0, len = repetitions; i < len; i++) {
    for (let j of durations) {
      initialTime += j;
      const currentPitch = resolvePitch(what);
      l.add([currentPitch, howLoud, initialTime, resolvedHowLong, onSomething]);
    }
  }
  return l;
}

export function euclidean(eventInput, arg2, arg3, arg4, arg5) {
  let repetitions = 1;
  let steps = rndInt(4, 12);
  let hits = steps - rndInt(1, 3);
  let rotation = 0;
  let a = [];
  let l = eventList.create();

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    repetitions = arg2.repetitions ?? repetitions;
    steps = arg2.steps ?? steps;
    hits = arg2.hits ?? hits;
    rotation = arg2.rotation ?? rotation;
  } else {
    if (arg2 !== undefined) repetitions = arg2;
    if (arg3 !== undefined) steps = arg3;
    if (arg4 !== undefined) hits = arg4;
    if (arg5 !== undefined) rotation = arg5;
  }

  if (steps <= 0) {
    throw new RangeError(
      `euclidean(): steps (${steps}) must be a positive number.`,
    );
  }
  if (hits < 0) {
    throw new RangeError(
      `euclidean(): hits (${hits}) must be a positive number.`,
    );
  }
  if (hits > steps) {
    throw new RangeError(
      `euclidean(): hits (${hits}) cannot be greater than steps (${steps}).`,
    );
  }
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;
  let currentTime = resolvedWhen;
  for (let rep = 0; rep < repetitions; rep++) {
    for (let i = 0; i < steps; i++) {
      let checkIndex = (i - rotation) % steps;
      if (checkIndex < 0) checkIndex += steps;
      const isHit = (checkIndex * hits) % steps < hits;
      if (isHit) {
        a.push(1);
        l.add([what, howLoud, currentTime, resolvedHowLong, onSomething]);
      } else {
        a.push(0);
      }
      currentTime += resolvedHowLong;
    }
  }
  a = a.slice(steps * -1);
  console.log(a);
  return l;
}

export function rotationSequence(eventInput, arg2) {
  let rhythm;
  const [what, howLoud, when, howLong, onSomething] = resolveEvent(eventInput);
  const resolvedWhen = typeof when === "function" ? when() : when;
  const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;

  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    rhythm = arg2.rhythm ?? rhythm;
  } else {
    if (arg2 !== undefined) rhythm = arg2;
  }

  const l = eventList.create();
  let currentTime = resolvedWhen;
  let durations = rhythm || [resolvedHowLong];
  let currentPattern = [...durations];

  for (let i = 0; i < durations.length; i++) {
    for (let dur of currentPattern) {
      l.add([what, howLoud, currentTime, dur, onSomething]);
      currentTime += dur;
    }
    currentPattern = rotate(currentPattern, 1);
  }
  return l;
}

export function blend(listA, listB) {
  if (!Array.isArray(listA) || !Array.isArray(listB)) {
    throw new TypeError("blend(): both arguments must be arrays.");
  }
  let listC = [];
  let size = Math.max(listA.length, listB.length);
  for (let i = 0; i < size; i++) {
    listC.push(listA[i % listA.length]);
    listC.push(listB[i % listB.length]);
  }
  return listC;
}

export function shuffle(list) {
  if (!Array.isArray(list)) {
    throw new TypeError("shuffle(): argument must be an array.");
  }
  //Fisher–Yates shuffle
  for (let i = list.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function autoPan(onSomething, arg2) {
  let hertz = 1;
  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    hertz = arg2.hertz ?? hertz;
  } else {
    if (arg2 !== undefined) hertz = arg2;
  }

  if (onSomething.panInterval) {
    clearInterval(onSomething.panInterval);
  }
  onSomething.panInterval = setInterval(() => {
    let timeInSeconds = Date.now() / 1000;
    let panValue = Math.sin((timeInSeconds / hertz) * Math.PI * 2);
    onSomething.pan(panValue);
  }, 10);
}

export function glissando(eventInput, arg2) {
  let targetPitch = 60;
  if (typeof arg2 === "object" && arg2 !== null && !Array.isArray(arg2)) {
    targetPitch = arg2.targetPitch ?? targetPitch;
  } else {
    if (arg2 !== undefined) targetPitch = arg2;
  }

  // Return an object exposing the play() method
  const runGlissando = function () {
    let [startPitch, howLoud, when, howLong, onSomething] =
      resolveEvent(eventInput);
    const resolvedHowLong = typeof howLong === "function" ? howLong() : howLong;

    onSomething.play(eventInput);
    const durationMs = resolvedHowLong * 1000;
    const startTime = performance.now();

    function runGlissandoLoop() {
      const elapsedTime = performance.now() - startTime;
      let progress = elapsedTime / durationMs;
      if (progress > 1) progress = 1;
      const currentPitch = startPitch + (targetPitch - startPitch) * progress;
      const bendOffset = currentPitch - startPitch;
      onSomething.bend(bendOffset);

      if (progress < 1) {
        setTimeout(runGlissandoLoop, 10);
      }
    }
    runGlissandoLoop();
  };

  return {
    play: runGlissando,
    toque: runGlissando,
  };
}

// portuguese aliases
export const midiParaNome = midiToName;
export const transpôr = transpose;
export const afinaçãoJusta = justIntonation;
export const frequênciaParaMidi = frequencyToMidi;
export const monótono = monotone;
export const acordeAleatório = randomChord;
export const arpejo = arpeggio;
export const sequênciaIntervalar = intervalSequence;
export const inverter = invert;
export const maisRápido = faster;
export const maisLento = slower;
export const maisForte = louder;
export const maisSuave = softer;
export const retrogradar = retrograde;
export const rotacionar = rotate;
export const sequenciaRotacao = rotationSequence;
export const euclideano = euclidean;
export const misturar = blend;
export const embaralhar = shuffle;
export const panAutomático = autoPan;

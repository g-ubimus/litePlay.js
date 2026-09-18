// Snippet palette content and pure insertion logic for the litePlay web
// editor. Kept separate from editor.js (which owns the DOM/CodeMirror
// wiring) so the data and the text-insertion math can be unit tested
// without a browser.

// Every `code` block below is ready-to-run JavaScript for the litePlay web
// editor. Each one was checked against the actual litePlay.js/extra.js
// implementations, so clicking any card produces code that really runs.
export const SNIPPET_CATEGORIES = [
  {
    id: "basics",
    title: "Basics",
    items: [
      {
        id: "play-note",
        label: "Play...",
        code: "play(C4);",
      },
      {
        id: "play-instrument",
        label: "...on something",
        code: "guitar.play(E3);",
      },
      {
        id: "play-tune",
        label: "...a sequence",
        code: "play(C4, E4, G4);",
      },
      {
        id: "play-chord",
        label: "...a chord",
        code: "play([C4], [E4], [G4]);",
      },
      {
        id: "stop-all",
        label: "Stop!",
        code: "stop();",
      },
      {
        id: "switch-instrument",
        label: "Switch instrument",
        code: "instrument(guitar);\nplay(E3);",
      },
      {
        id: "random-instrument",
        label: "Random instrument",
        code: "play(onSomething);",
      },
    ],
  },
  {
    id: "harmony",
    title: "Pitch & Harmony",
    items: [
      {
        id: "chord",
        label: "Play a chord",
        code: "blockChord({onSomething:vibraphone}, [C4,E4,G4]).play()",
      },
      {
        id: "random-chord",
        label: "Random chord",
        code: "let chord = randomChord(4);\nblockChord(any, chord).play();",
      },
      {
        id: "transpose",
        label: "Transpose a melody",
        code: "let notes = [C4, D4, E4, F4, G4];\nlet transposedNotes = transpose(notes, 6);\nlet transposed = eventList.create();\nfor (let i = 0; i < transposedNotes.length; i++) {\ntransposed.add([transposedNotes[i], midLevel, i+when+1]);\n}\ntransposed.play();",
      },
      {
        id: "invert",
        label: "Invert a melody",
        code: 'let original = [C4, D4, E4, F4];\narpeggio(any, {chord: original, direction:"forward"}).play();\nlet inverted = invert(original, C4);\narpeggio({when:5}, {chord: inverted, direction:"forward"}).play();\n',
      },
      {
        id: "microtonal",
        label: "Microtonal scale",
        code: "let scale = edo(19);\nlet transposedScale = transpose(scale, A4);\nlet list = eventList.create();\nfor (let i = 0; i < transposedScale.length; i++) {\nlist.add([transposedScale[i], loud, i*.2, .2, guitar]);\n}\nlist.play();",
      },
      {
        id: "just-intonation",
        label: "Just intonation scale",
        code: "let inTune = justIntonation(C4, 13);\nlet list = eventList.create();\nfor (let i = 0; i < inTune.length; i++) {\nlist.add([inTune[i], loud, i*.3, .3, clarinet]);\n}\nlist.play();",
      },
      {
        id: "glissando",
        label: "Glissando",
        code: "glissando(C4, G4).play();",
      },
    ],
  },
  {
    id: "rhythm",
    title: "Rhythm & Pattern",
    items: [
      {
        id: "arpeggio",
        label: "Arpeggio",
        code: 'arpeggio(C4, [C4, E4, G4, C5], 2, "forward").play();',
      },
      {
        id: "euclidean",
        label: "Euclidean rhythm",
        code: "euclidean({what: snare, howLong: .2, onSomething: drums}, 4, 8, 3).play();",
      },
      {
        id: "ostinato",
        label: "Ostinato riff",
        code: "ostinato(C4, 4, [0.5, 0.25, 0.25]).play();",
      },
      {
        id: "interval-sequence",
        label: "Rising/falling steps",
        code: 'intervalSequence(C4, 3, 4, "up").play();',
      },
      {
        id: "rotation-sequence",
        label: "Rotating rhythm",
        code: "rotationSequence(C4, [0.5, 0.25, 0.25]).play();",
      },
      {
        id: "iterate",
        label: "Iterate through notes & durations",
        code: "iterate(C4, { what: [C4, E4, G4], howLong: [0.5, 0.25, 0.25] }).play();",
      },
    ],
  },
  {
    id: "effects",
    title: "Effects",
    items: [
      {
        id: "distortion",
        label: "Distortion",
        code: "guitar.distortion(0.7);\nguitar.play(E2);",
      },
      {
        id: "highpass",
        label: "Highpass filter",
        code: "piano.highpass(0.4);\npiano.play(C4);",
      },
      {
        id: "moog-filter",
        label: "Moog-style filter",
        code: "synth.moogFilter(0.3, 0.85);\nsynth.play(C3);",
      },
      {
        id: "comb-filter",
        label: "Comb filter",
        code: "marimba.combFilter(2, 0.015);\nmarimba.play(C4);",
      },
      {
        id: "string-resonance",
        label: "String resonance",
        code: "harp.stringResonance(220, 0.93);\nharp.play(A3);",
      },
      {
        id: "compressor",
        label: "Compressor",
        code: "drums.compressor(0.6, 0.25);\ndrums.play(kick);",
      },
      {
        id: "tremolo",
        label: "Tremolo",
        code: "organ.tremolo(6, 0.6);\norgan.play(G3);",
      },
      {
        id: "limiter",
        label: "Limiter",
        code: "drums.limiter(0.3);\ndrums.play(kick);",
      },
      {
        id: "ring-modulate",
        label: "Ring modulation",
        code: "tinkleBell.ringModulate(233, 0.8);\ntinkleBell.play(C5);",
      },
      {
        id: "flanger",
        label: "Flanger",
        code: "guitar.flanger(0.3, 0.006, 0.7);\nguitar.play([E3, 1, 0, 4]);",
      },
      {
        id: "chorus",
        label: "Chorus",
        code: "strings.chorus(0.25, 0.02);\nstrings.play([C4, 1, 0, 4]);",
      },
      {
        id: "phaser",
        label: "Phaser",
        code: "pad1.phaser(0.4, 6, 0.85);\npad1.play([C3, 1, 0, 6]);",
      },
      {
        id: "sample-hold",
        label: "Sample & hold",
        code: "synth.sampleHold(9, 0.7);\nsynth.play(A3);",
      },
      {
        id: "convolve",
        label: "Convolution reverb",
        code: "piano.convolve(0.6);\npiano.play(C4);",
      },
      {
        id: "reverb-tone",
        label: "Shape the reverb",
        code: "piano.reverb(0.8);\nreverbTone(0.9, 0.1);\npiano.play(C4);",
      },
    ],
  },
  {
    id: "utility",
    title: "Utility",
    items: [
      {
        id: "random-number",
        label: "Random number",
        code: "play(C4 + rndInt(0, 12));",
      },
      {
        id: "choose",
        label: "Pick randomly from a list",
        code: "play(choose(C4, E4, G4));",
      },
      {
        id: "wait",
        label: "Wait, then play",
        code: "silently(500).then(() => play(G4));",
      },
      {
        id: "pan",
        label: "Pan left/right",
        code: "piano.pan(0.2);\npiano.play(C4);",
      },
      {
        id: "delay",
        label: "Echo / delay",
        code: "guitar.delay(0.3, 0.4);\nguitar.play(E3);",
      },
      {
        id: "autopan",
        label: "Auto-pan",
        code: "pad1.autoPan(0.5);\nplay([C3, 1, 0, 4]);",
      },
    ],
  },
];

/**
 * Computes the text to insert for a given snippet, without touching the DOM
 * or CodeMirror, so it can be unit tested directly.
 *
 * - If `doc` is empty/whitespace-only, inserts `code` directly and places
 *   the cursor right after the inserted text.
 * - Otherwise, inserts `code` at `cursorPos` surrounded by newlines, and
 *   moves the cursor to the end of the inserted text.
 */
export function buildInsertion(doc, cursorPos, code) {
  if (doc.trim() === "") {
    const text = code;
    return {
      from: 0,
      to: doc.length,
      insert: text,
      cursor: text.length,
    };
  }

  const insert = "\n" + code + "\n";
  const pos = Math.max(0, Math.min(cursorPos, doc.length));
  return {
    from: pos,
    to: pos,
    insert,
    cursor: pos + insert.length,
  };
}

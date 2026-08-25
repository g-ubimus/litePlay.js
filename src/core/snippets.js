// Snippet palette content and pure insertion logic for the litePlay web
// editor. Kept separate from editor.js (which owns the DOM/CodeMirror
// wiring) so the data and the text-insertion math can be unit tested
// without a browser.

// Every `code` block below is body-only JavaScript, meant to be inserted
// inside a `function f() { ... }` that gets passed to `lpRun(f)`. Each one
// was checked against the actual litePlay.js/extra.js implementations, so
// clicking any card produces code that really runs.
export const SNIPPET_CATEGORIES = [
  {
    id: "basics",
    title: "Basics",
    items: [
      {
        id: "play-note",
        label: "Play a note",
        description: "Plays one note on the default instrument.",
        code: "play(C4);",
      },
      {
        id: "play-instrument",
        label: "Play on an instrument",
        description: "Any instrument name works as a method call.",
        code: "guitar.play(E3);",
      },
      {
        id: "play-tune",
        label: "Play a little tune",
        description: "Several play() calls with different start times.",
        code: "play(C4);\nplay(E4, 0.8, 1);\nplay(G4, 0.8, 2);",
      },
      {
        id: "switch-instrument",
        label: "Switch the default instrument",
        description: "instrument() changes what play() uses from then on.",
        code: "instrument(guitar);\nplay(E3);",
      },
      {
        id: "random-instrument",
        label: "Surprise instrument",
        description: "onStruck() picks a random mallet/keyboard sound.",
        code: "instrument(onStruck());\nplay(C4);",
      },
      {
        id: "stop-all",
        label: "Stop everything",
        description: "Silences every note on the default instrument.",
        code: "stop();",
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
        description: "blockChord() plays a list of notes together, at once.",
        code: "blockChord(C4, [C4, E4, G4]).play();",
      },
      {
        id: "random-chord",
        label: "Random chord",
        description: "randomChord() picks a set of random notes for you.",
        code: "let chord = randomChord(4);\nblockChord(C4, chord).play();",
      },
      {
        id: "transpose",
        label: "Transpose a melody",
        description: "Shifts every note in a list by the same interval.",
        code: 'let melody = [C4, E4, G4];\nlet shifted = transpose(melody, 5);\nshifted.forEach((n, i) => play(n, 0.8, i));',
      },
      {
        id: "invert",
        label: "Invert a melody",
        description: "Flips a melody upside-down around a chosen note.",
        code: 'let melody = [C4, E4, G4];\nlet flipped = invert(melody, C4);\nflipped.forEach((n, i) => play(n, 0.8, i));',
      },
      {
        id: "microtonal",
        label: "Microtonal scale",
        description: "edo() divides the octave into equal steps.",
        code: "let scale = edo(24);\nplay(C4 + scale[3]);",
      },
      {
        id: "just-intonation",
        label: "Just intonation scale",
        description: "Builds a scale from pure harmonic ratios.",
        code: "let scale = justIntonation(C4, 8);\nplay(scale[2]);",
      },
      {
        id: "glissando",
        label: "Glissando",
        description: "Smoothly slides a note's pitch to a target pitch.",
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
        description: "Plays a list of notes one after another.",
        code: 'arpeggio(C4, [C4, E4, G4, C5], 2, "forward").play();',
      },
      {
        id: "euclidean",
        label: "Euclidean rhythm",
        description: "Spreads hits as evenly as possible across steps.",
        code: "euclidean(C4, 2, 8, 3).play();",
      },
      {
        id: "ostinato",
        label: "Ostinato riff",
        description: "Repeats a note using a custom list of durations.",
        code: "ostinato(C4, 4, [0.5, 0.25, 0.25]).play();",
      },
      {
        id: "interval-sequence",
        label: "Rising/falling steps",
        description: "Repeats a note while moving it up or down by a step.",
        code: 'intervalSequence(C4, 3, 4, "up").play();',
      },
      {
        id: "rotation-sequence",
        label: "Rotating rhythm",
        description: "Plays a rhythm pattern, rotated by one step each time.",
        code: "rotationSequence(C4, [0.5, 0.25, 0.25]).play();",
      },
      {
        id: "iterate",
        label: "Cycle through notes & durations",
        description: "Cycles lists of pitches and durations together.",
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
        description: "0 (clean) to 1 (fully driven).",
        code: "guitar.distortion(0.7);\nplay(E2);",
      },
      {
        id: "highpass",
        label: "Highpass filter",
        description: "0 (off) to 1 (brightest, thinnest).",
        code: "piano.highpass(0.4);\nplay(C4);",
      },
      {
        id: "moog-filter",
        label: "Moog-style filter",
        description: "A classic ladder lowpass; push resonance to self-oscillate.",
        code: "synth.moogFilter(0.3, 0.85);\nplay(C3);",
      },
      {
        id: "comb-filter",
        label: "Comb filter",
        description: "Turns a note into a ringing, metallic resonance.",
        code: "marimba.combFilter(2, 0.015);\nplay(C4);",
      },
      {
        id: "string-resonance",
        label: "String resonance",
        description: "Adds a sympathetic, ringing string character.",
        code: "harp.stringResonance(220, 0.93);\nplay(A3);",
      },
      {
        id: "compressor",
        label: "Compressor",
        description: "Squeezes loud notes down toward a threshold.",
        code: "drums.compressor(0.6, 0.25);\nplay(kick);",
      },
      {
        id: "tremolo",
        label: "Tremolo",
        description: "An amplitude wobble: rate in Hz, depth 0 to 1.",
        code: "organ.tremolo(6, 0.6);\nplay(G3);",
      },
      {
        id: "limiter",
        label: "Limiter",
        description: "A hard ceiling on volume; lower it for a crunchy clip.",
        code: "drums.limiter(0.3);\nplay(kick);",
      },
      {
        id: "ring-modulate",
        label: "Ring modulation",
        description: "Bell-like, robotic textures.",
        code: "tinkleBell.ringModulate(233, 0.8);\nplay(C5);",
      },
      {
        id: "flanger",
        label: "Flanger",
        description: "A sweeping, metallic comb effect.",
        code: "guitar.flanger(0.3, 0.006, 0.7);\nplay([E3, 1, 0, 4]);",
      },
      {
        id: "chorus",
        label: "Chorus",
        description: "A thicker, wider doubling effect.",
        code: "strings.chorus(0.25, 0.02);\nplay([C4, 1, 0, 4]);",
      },
      {
        id: "phaser",
        label: "Phaser",
        description: "A sweeping series of notches.",
        code: "pad1.phaser(0.4, 6, 0.85);\nplay([C3, 1, 0, 6]);",
      },
      {
        id: "sample-hold",
        label: "Sample & hold",
        description: "Freezes the signal into lo-fi, stepped chunks.",
        code: "synth.sampleHold(9, 0.7);\nplay(A3);",
      },
      {
        id: "convolve",
        label: "Convolution reverb",
        description: "Runs the sound through a real recorded space.",
        code: "piano.convolve(0.6);\nplay(C4);",
      },
      {
        id: "reverb-tone",
        label: "Shape the reverb",
        description: "Sets the size/brightness of the shared reverb.",
        code: "piano.reverb(0.8);\nreverbTone(0.9, 0.1);\nplay(C4);",
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
        description: "rnd()/rndInt() pick a random value between two bounds.",
        code: "play(C4 + rndInt(0, 12));",
      },
      {
        id: "choose",
        label: "Pick randomly from a list",
        description: "choose() randomly picks one of the options you give it.",
        code: "play(choose(C4, E4, G4));",
      },
      {
        id: "wait",
        label: "Wait, then play",
        description: "silently() pauses before the next line runs.",
        code: "silently(500).then(() => play(G4));",
      },
      {
        id: "pan",
        label: "Pan left/right",
        description: "0 = left, 1 = right, 0.5 = center.",
        code: "piano.pan(0.2);\nplay(C4);",
      },
      {
        id: "delay",
        label: "Echo / delay",
        description: "Adds a repeating echo.",
        code: "guitar.delay(0.3, 0.4);\nplay(E3);",
      },
      {
        id: "autopan",
        label: "Auto-pan",
        description: "Sweeps an instrument across the stereo field.",
        code: "pad1.autoPan(0.5);\nplay([C3, 1, 0, 4]);",
      },
    ],
  },
];

const INDENT = "  ";

function indentBlock(code) {
  return code
    .split("\n")
    .map((line) => INDENT + line)
    .join("\n");
}

/**
 * Computes the text to insert for a given snippet, without touching the DOM
 * or CodeMirror, so it can be unit tested directly.
 *
 * - If `doc` is empty/whitespace-only, wraps `code` in a fresh
 *   `function f() { ... } lpRun(f);` sketch and places the cursor right
 *   after the inserted code, so the next snippet click appends inside the
 *   same function body.
 * - Otherwise, inserts `code` at `cursorPos`, indented to match a function
 *   body, and moves the cursor to the end of the inserted text.
 */
export function buildInsertion(doc, cursorPos, code) {
  if (doc.trim() === "") {
    const before = "function f() {\n" + indentBlock(code) + "\n";
    const after = "}\nlpRun(f);\n";
    return {
      from: 0,
      to: doc.length,
      insert: before + after,
      cursor: before.length,
    };
  }

  const insert = "\n" + indentBlock(code) + "\n";
  const pos = Math.max(0, Math.min(cursorPos, doc.length));
  return {
    from: pos,
    to: pos,
    insert,
    cursor: pos + insert.length,
  };
}

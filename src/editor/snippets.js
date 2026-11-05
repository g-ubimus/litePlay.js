// Snippet palette content and pure insertion logic for the litePlay web
// editor. Kept separate from editor.js (which owns the DOM/CodeMirror
// wiring) so the data and the text-insertion math can be unit tested
// without a browser.
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
        code: "let notes = [C4, D4, E4, F4, G4];\nlet transposedNotes = transpose(notes, 6);\nlet transposed = eventList.create();\nfor (let i = 0; i < transposedNotes.length; i++) {\ntransposed.add([transposedNotes[i], midLevel, i+1]);\n}\ntransposed.play();",
      },
      {
        id: "invert",
        label: "Invert a melody",
        code: 'let original = [C4, D4, E4, F4];\narpeggio(any, {chord: original, direction:"forward"}).play();\nlet inverted = invert(original, C4);\narpeggio({when:5}, {chord: inverted, direction:"forward"}).play();\n',
      },
      {
        id: "microtonal",
        label: "Microtonal intervals",
        code: "play(C4+quarterTone) // equivalent to 60.5 \n//try these:\n//play(C4+thirdTone) // equivalent to 60.33\n//play(C4+eighthTone) // equivalent to 60.25\n//play(C4+tenCent) // equivalent to 60.1\n//play(C4+oneCent) // equivalent to 60.01;",
      },
      {
        id: "edo",
        label: "Equal Division of Octave scale (EDO)",
        code: "let scale = edo(19);\nlet transposedScale = transpose(scale, A4);\nlet list = eventList.create();\nfor (let i = 0; i < transposedScale.length; i++) {\nlist.add([transposedScale[i], loud, i*.2, .2, guitar]);\n}\nlist.play();",
      },
      {
        id: "just-intonation",
        label: "Just intonation scale",
        code: "let inTune = justIntonation(C4, 13);\nlet list = eventList.create();\nfor (let i = 0; i < inTune.length; i++) {\nlist.add([inTune[i], loud, i*.3, .3, clarinet]);\n}\nlist.play();",
      },
      {
        id: "monotone",
        label: "Monotone",
        code: "let e = [()=>monotone(C4), loud, 0, .1, clarinet];\nostinato(e, 100).play()",
      },
    ],
  },
  {
    id: "rhythm",
    title: "Rhythm & Patterns",
    items: [
      {
        id: "arpeggio",
        label: "Arpeggio",
        code: 'arpeggio({onSomething:mutedTrumpet}, [C4, E4, G4, C5], 2, "forward").play();',
      },
      {
        id: "euclidean",
        label: "Euclidean rhythms",
        code: "euclidean({what: snare, howLong: .2, onSomething: drums}, 4, 8, 3).play();",
      },
      {
        id: "ostinato",
        label: "Ostinato",
        code: "let rhythm = [0.5, 0.165, 0.165, 0.165, 0.5, 0.165, 0.165, 0.165, 0.5, 0.165, 0.165, 0.165, 0.5, 0.5];\nostinato({what: snare, onSomething:drums}, 4, rhythm).play();",
      },
      {
        id: "rndRhythm",
        label: "Random rhythm",
        code: "let rhythm = randomRhythm(8, shortDur);\nostinato([snare, .6, 0, .25, drums], 4, rhythm).play();",
      },
      {
        id: "interval-sequence",
        label: "Rising/falling steps",
        code: 'intervalSequence(C4, 3, 4, "up").play();\n//falling:\n//intervalSequence(C4, 3, 4, "down").play()',
      },
      {
        id: "rotation-sequence",
        label: "Rotating rhythm",
        code: "rotationSequence({onSomething: onDrums}, [0.5, 0.25, 0.25]).play();",
      },
      {
        id: "iterate",
        label: "Iterate through notes & durations",
        code: "iterate(C4, {what: [C4, E4, G4], howLong: [0.5, 0.25, 0.25]}).play();",
      },
    ],
  },
  {
    id: "effects",
    title: "Effects",
    items: [
      {
        id: "ampEnv",
        label: "Amplitude Envelope",
        code: "strings.reverb(1);\nstrings.ampEnvelope(.5,1,1,10);\nstrings.play([C2, 1, 0], [Bb2, .9, .5], [Ab3, .8, 1], [Gb4, .7, 1.5], [E5, .6, 2], [D6, .5, 2.5]); // Alien chord",
      },
      {
        id: "bend",
        label: "Bend",
        code: "sequencer.clear();\nsequencer.clearCallbacks();\nsequencer.play();\nfunction time() {\n  piano.bend(rnd(-1,1))\n  piano.play([hiPitch,loud,choose(now,soon,later),longDur])\n  sequencer.addCallback(time)\n}\nsequencer.addCallback(time)",
      },
      {
        id: "chorus",
        label: "Chorus",
        code: "strings.chorus(0.25, 0.02);\nstrings.play([C4, 1, 0, 4]);",
      },
      {
        id: "distortion",
        label: "Distortion",
        code: "guitar.distortion(0.7);\nguitar.play(E2);",
      },
      {
        id: "delay",
        label: "Echo/Delay",
        code: "xylophone.delay(.1, .9)\nxylophone.play();",
      },
      {
        id: "filterEnv",
        label: "Filter Envelope",
        code: "synth.filterEnvelope(.7, 1, 1, 1, 1);\nsynth.cutoff(.5);\nsynth.play([hiPitch,loud,0,1]);",
      },
      {
        id: "highpass",
        label: "Highpass filter",
        code: "piano.highpass(0.4);\npiano.play(C4);",
      },
      {
        id: "pan",
        label: "Pan left/right",
        code: "drums2.pan(0);\ndrums2.play([snare, 1, 0]);",
      },
      {
        id: "shift",
        label: "Frequency Shifter",
        code: "piano.shift(100);\npiano.play();",
      },
      {
        id: "tremolo",
        label: "Tremolo",
        code: "organ.tremolo(6, 0.6);\norgan.play(G3);",
      },
      {
        id: "resonance",
        label: "Filter resonance",
        code: "synth.resonance(.95);\nsynth.cutoff(.8);\nsynth.play();",
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
        id: "retrograde",
        label: "List inversion",
        code: "let myList = [1, 2, 3, 4];\nlet retro = retrograde(myList);\nconsole.log(retro) //returns [4,3,2,1]",
      },
      {
        id: "rotation",
        label: "List rotation",
        code: "let melody = [1, 2, 3, 4];\nlet rotated = rotate(melody, 2);\nconsole.log(rotated) // returns [3,4,1,2]",
      },
      {
        id: "blend",
        label: "Blend two lists",
        code: "let listA = [1,2,3];\nlet listB = [4,5,6,7,8];\nconsole.log(blend(listA,listB)) // returns [1, 4, 2, 5, 3, 6, 1, 7, 2, 8]",
      },
      {
        id: "shuffle",
        label: "Shuffle a list",
        code: "let melody = [1, 2, 3, 4];\nlet shuffled = shuffle(melody);\nconsole.log(shuffled)",
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

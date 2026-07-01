// code mirror
import { basicSetup } from "https://esm.sh/codemirror@6.0.2";
import { EditorView, keymap } from "https://esm.sh/@codemirror/view";
import { EditorState, Prec } from "https://esm.sh/@codemirror/state";
import {
  javascript,
  javascriptLanguage,
} from "https://esm.sh/@codemirror/lang-javascript";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete";
import {
  syntaxHighlighting,
  HighlightStyle,
} from "https://esm.sh/@codemirror/language";
import { tags } from "https://esm.sh/@lezer/highlight";
import { StateField } from "https://esm.sh/@codemirror/state";
import { showTooltip } from "https://esm.sh/@codemirror/view";
// extendable media recorder
import {
  MediaRecorder,
  register,
} from "https://esm.sh/extendable-media-recorder";
import { connect } from "https://esm.sh/extendable-media-recorder-wav-encoder";
// add essentia
import { toggleListening } from "../listener/listener.js";

// override function to print output in console
const consoleOutput = document.getElementById("console-output");
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
  originalLog.apply(console, args);
  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ");
  if (consoleOutput) {
    consoleOutput.value += message + "\n";
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
};

console.error = function (...args) {
  originalError.apply(console, args);
  const message = args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.toString();
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return "[Unstringifiable Object]";
        }
      }
      return String(arg);
    })
    .join(" ");
  if (consoleOutput) {
    consoleOutput.value += message + "\n";
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }
};

// run and stop litePlay (must be before startState)
function runLP() {
  try {
    const currentCode = editor.state.doc.toString();
    if (currentCode.trim() === "") throw new Error("Empty! Write something!");

    eval(currentCode);
    return true;
  } catch (error) {
    console.error(error);
    return true;
  }
}

// stop button
const stopLP = async (event) => {
  if (liteplayEngine) {
    console.log("Stopping audio...");
    await reset();
    console.log("Audio stopped.");
  }
};

// import constants for autocompletion
import * as litePlayLang from "./litePlay.js";
import { midiRecorder } from "./litePlay.js";
import * as extra from "./extra.js";
import * as listener from "../listener/listener.js";
const lpKeys = Object.keys(litePlayLang);
const extraKeys = Object.keys(extra);
const listenerKeys = Object.keys(listener);

function litePlayCompletions(context) {
  let word = context.matchBefore(/[a-zA-Z0-9_À-ÿ]+/);
  if (!word && !context.explicit) return null;

  // 1. Define the different sources of keywords
  const sources = [
    { keys: lpKeys, lib: litePlayLang, sourceName: "litePlay" },
    { keys: extraKeys, lib: extra, sourceName: "extra" },
    { keys: listenerKeys, lib: listener, sourceName: "listener" },
  ];

  // 2. Flatten all keys into a single array of options
  const options = sources.flatMap((source) =>
    source.keys.map((keyword) => {
      // Look up the actual value in the corresponding library namespace
      const itemValue = source.lib[keyword];
      const jsType = typeof itemValue;

      // Map JS types to CodeMirror autocomplete icons/types
      let cmType = "variable";
      if (jsType === "function") cmType = "function";
      else if (jsType === "number" || jsType === "string") cmType = "constant";
      else if (jsType === "object") cmType = "class";

      return {
        label: keyword,
        type: cmType,
        detail: jsType, // Shows "function" or "object" next to the name
        info: source.sourceName, // Tooltip showing which file it came from
      };
    }),
  );

  return {
    from: word ? word.from : context.pos,
    options: options,
  };
}

// help system
const functionSignatures = {
  play: "play([what, howLoud, when, howLong, onSomething])",
  create: "create([what, howLoud, when, howLong, onSomething])",
  remove: "remove(index)",
  insert: "insert(position, [what, howLoud, when, howLong, onSomething])",
  repeat: "repeat(times, when)",
  midiToName: "midiToName(number)",
  midiToFrequency: "midiToFrequency(midi)",
  frequencyToMidi: "frequencyToMidi(frequency)",
  edo: "edo(number of divisions)",
  justIntonation: "justIntonation(base pitch, number of harmonics)",
  monotone: "monotone(initial tone, interval)",
  transpose: "transpose([notes], interval)",
  randomChord: "randomChord(size, range, microtonal = false)",
  blockChord:
    "blockChord([what, howLoud, when, howLong, onSomething], [chord])",
  arpeggio:
    "arpeggio([what, howLoud, when, howLong, onSomething], [chord], repetitions, direction)",
  intervalSequence:
    "intervalSequence([what, howLoud, when, howLong, onSomething], interval, repetitions, direction)",
  invert: "invert([melody], axis)",
  faster:
    "faster([what, howLoud, when, howLong, onSomething], lastDuration, steps)",
  slower:
    "slower([what, howLoud, when, howLong, onSomething], lastDuration, steps)",
  ostinato:
    "ostinato([what, howLoud, when, howLong, onSomething], repetitions, [rhythm])",
  euclidean:
    "euclidean([what, howLoud, when, howLong, onSomething], repetitions, steps, hits, rotation)",
  rotationSequence:
    "rotationSequence([what, howLoud, when, howLong, onSomething], [rhythm])",
  louder: "louder([what, howLoud, when, howLong, onSomething], lastAmp, steps)",
  softer: "softer([what, howLoud, when, howLong, onSomething], lastAmp, steps)",
  autoPan: "autoPan(instrument, seconds)",
  glissando:
    "glissando([what, howLoud, when, howLong, onSomething], targetPitch)",
  retrograde: "retrograde([list])",
  shuffle: "shuffle([list])",
  rotate: "rotate([list], steps)",
  blend: "blend([listA], [listB])",
  stop: "stop([what, when])",
  instrument: "instrument(instrumentName)",
  sub: "sub(note1, note2, ...)",
  rnd: "rnd(min, max)",
  rndInt: "rndInt(min, max)",
  choose: "choose(option1, option2, ...)",
  silently: "silently(ms)",
  toque: "toque([oQuê, quãoForte, quando, quantoTempo, emAlgo])",
  midiParaNome: "midiParaNome(midi)",
  transpôr: "transpôr([notas], intervalo)",
  afinaçãoJusta: "afinaçãoJusta(altura base, número de harmônicos)",
  frequênciaParaMidi: "frequênciaParaMidi(frequência)",
  monótono: "monótono(altura inicial, intervalo)",
  acordeAleatório: "acordeAleatório(tamanho, registro, microtonal = false)",
  arpejo:
    "arpejo([oQuê, quãoForte, quando, quantoTempo, emAlgo], [acorde], repetições, direção)",
  sequênciaIntervalar:
    "sequênciaIntervalar([oQuê, quãoForte, quando, quantoTempo, emAlgo], intervalo, repetições, direção)",
  inverter: "inverter([melodia], eixo)",
  maisRápido:
    "maisRápido([oQuê, quãoForte, quando, quantoTempo, emAlgo], passos, razão<1)",
  maisLento:
    "maisLento([oQuê, quãoForte, quando, quantoTempo, emAlgo], passos, razão>1)",
  maisForte:
    "maisForte([oQuê, quãoForte, quando, quantoTempo, emAlgo], última intensidade, passos)",
  maisSuave:
    "maisSuave([oQuê, quãoForte, quando, quantoTempo, emAlgo], última intensidade, passos)",
  retrogradar: "retrogradar([lista])",
  rotacionar: "rotacionar([lista])",
  sequenciaRotacao:
    "sequenciaRotacao([oQuê, quãoForte, quando, quantoTempo, emAlgo], [ritmo])",
  euclideano:
    "euclideano([oQuê, quãoForte, quando, quantoTempo, emAlgo], repetições, passos, ataques, rotação)",
  misturar: "misturar([listaA], [listaB])",
  embaralhar: "embaralhar([lista])",
  panAutomático: "panAutomático(instrumento, segundos)",
  pare: "pare()",
  instrumento: "instrumento(nomeDoInstrumento)",
  escolha: "escolha(opcao1, opcao2, ...)",
  quieto: "quieto(ms)",
};

const signatureTooltipField = StateField.define({
  create: getSignatureTooltip,

  update(tooltip, tr) {
    if (!tr.docChanged && !tr.selection) return tooltip;
    return getSignatureTooltip(tr.state);
  },
  provide: (f) => showTooltip.from(f),
});

function getSignatureTooltip(state) {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const textUpToCursor = line.text.slice(0, pos - line.from);
  const match = textUpToCursor.match(/([\p{L}0-9_]+)\s*\([^)]*$/u);
  //const match = textUpToCursor.match(/([a-zA-Z0-9_]+)\s*\([^)]*$/);
  if (!match) return null;
  const funcName = match[1];
  const signature = functionSignatures[funcName];
  if (!signature) return null;
  return {
    pos: pos,
    above: false,
    strictSide: false,
    create(view) {
      let dom = document.createElement("div");
      dom.className = "cm-signature-tooltip";
      dom.textContent = signature;
      return { dom };
    },
  };
}

// save button
const saveCode = () => {
  const now = new Date();
  const datetime = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getHours()}-${now.getMinutes()}`;

  const text = editor.state.doc.toString();
  const blob = new Blob([text], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "litePlay" + datetime + ".js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};

const pastelTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--editor-bg)",
    color: "var(--editor-text)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--gutter-bg) !important",
    color: "var(--gutter-text) !important",
    border: "none !important",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--syntax-cursor)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--syntax-selection) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--syntax-active-line)",
  },
});

// custom colors for colorblind
const pastelHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--syntax-keyword)" },
  { tag: tags.controlKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.definitionKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.moduleKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.operatorKeyword, color: "var(--syntax-keyword)" },
  { tag: tags.modifier, color: "var(--syntax-keyword)" },
  { tag: tags.string, color: "var(--syntax-string)" },
  { tag: tags.special(tags.string), color: "var(--syntax-string)" },
  { tag: tags.regexp, color: "var(--syntax-string)" },
  { tag: tags.number, color: "var(--syntax-number)" },
  { tag: tags.bool, color: "var(--syntax-bool)" },
  { tag: tags.null, color: "var(--syntax-bool)" },
  { tag: tags.comment, color: "var(--syntax-comment)" },
  { tag: tags.typeName, color: "var(--syntax-type)" },
  { tag: tags.definition(tags.typeName), color: "var(--syntax-type)" },
  { tag: tags.operator, color: "var(--syntax-operator)" },
  { tag: tags.derefOperator, color: "var(--syntax-operator)" },
  { tag: tags.arithmeticOperator, color: "var(--syntax-operator)" },
  { tag: tags.logicOperator, color: "var(--syntax-operator)" },
  { tag: tags.bitwiseOperator, color: "var(--syntax-operator)" },
  { tag: tags.compareOperator, color: "var(--syntax-operator)" },
  { tag: tags.updateOperator, color: "var(--syntax-operator)" },
  { tag: tags.definitionOperator, color: "var(--syntax-operator)" },
  { tag: tags.typeOperator, color: "var(--syntax-operator)" },
  { tag: tags.controlOperator, color: "var(--syntax-operator)" },
  { tag: tags.punctuation, color: "var(--syntax-punctuation)" },
  { tag: tags.separator, color: "var(--syntax-punctuation)" },
  { tag: tags.bracket, color: "var(--syntax-punctuation)" },
  { tag: tags.angleBracket, color: "var(--syntax-punctuation)" },
  { tag: tags.squareBracket, color: "var(--syntax-punctuation)" },
  { tag: tags.paren, color: "var(--syntax-punctuation)" },
  { tag: tags.brace, color: "var(--syntax-punctuation)" },
  { tag: tags.variableName, color: "var(--syntax-variable)" },
  {
    tag: tags.definition(tags.variableName),
    color: "var(--syntax-definition)",
  },
  { tag: tags.special(tags.variableName), color: "var(--syntax-function)" },
  { tag: tags.standard(tags.variableName), color: "var(--syntax-function)" },
  { tag: tags.function(tags.variableName), color: "var(--syntax-function)" },
  { tag: tags.self, color: "var(--syntax-keyword)" },
  { tag: tags.tagName, color: "var(--syntax-tag)" },
  { tag: tags.attributeName, color: "var(--syntax-attribute)" },
  { tag: tags.propertyName, color: "var(--syntax-attribute)" },
  { tag: tags.labelName, color: "var(--syntax-variable)" },
]);

// CM startState
const startState = EditorState.create({
  extensions: [
    basicSetup,
    pastelTheme,
    syntaxHighlighting(pastelHighlight),
    javascript(),
    javascriptLanguage.data.of({
      autocomplete: litePlayCompletions,
    }),
    autocompletion(),
    signatureTooltipField,
    Prec.highest(
      keymap.of([
        { key: "Mod-Enter", run: runLP },
        { key: "Mod-.", run: stopLP },
        { key: "Mod-s", run: saveCode },
      ]),
    ),
  ],
});

let editor = new EditorView({
  state: startState,
  parent: document.getElementById("editor-container"),
});

// start litePlay
let liteplayEngine = null;

document.addEventListener(
  "pointerdown",
  async () => {
    if (!liteplayEngine) {
      try {
        console.log("Loading litePlay engine...");
        liteplayEngine = await lpLoad();

        // expose all of litePlay.js exports to the global window
        Object.assign(window, liteplayEngine);
        Object.assign(window, extra);
        Object.assign(window, listener);
        console.log("litePlay is ready!");

        // change button colors when ready
        const runBtn = document.getElementById("run-btn");
        if (runBtn) runBtn.classList.add("ready-green");

        //const recBtn = document.getElementById("rec-btn");
        //if (recBtn) recBtn.classList.add("ready-red");

        startListener();
      } catch (error) {
        console.error("Failed to auto-start litePlay:", error);
      }
    }
  },
  { once: true },
);

// recording feature (extendable mediaRecorder)
let mediaRecorder = null;
let audioChunks = [];
let connectedCsoundNode = null;
let destNode = null;
let encoderRegistered = false;

async function startRecording() {
  if (
    !window.audio_context ||
    !window.csound ||
    (mediaRecorder && mediaRecorder.state === "recording")
  ) {
    console.error("Engine not ready or already recording.");
    return;
  }

  try {
    if (!encoderRegistered) {
      await register(await connect());
      encoderRegistered = true;
      const recBtn = document.getElementById("rec-btn");
      if (recBtn) recBtn.classList.add("start-rec");
    }

    connectedCsoundNode = await window.csound.getNode();
    destNode = window.audio_context.createMediaStreamDestination();
    connectedCsoundNode.connect(destNode);

    const targetSampleRate = 41000;
    const resampleContext = new (
      window.AudioContext || window.webkitAudioContext
    )({ sampleRate: targetSampleRate });
    const sourceNode = resampleContext.createMediaStreamSource(destNode.stream);
    const resampledDestNode = resampleContext.createMediaStreamDestination();

    sourceNode.connect(resampledDestNode);
    mediaRecorder = new MediaRecorder(resampledDestNode.stream, {
      mimeType: "audio/wav",
    });

    audioChunks = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const recBtn = document.getElementById("rec-btn");
      if (recBtn) recBtn.classList.remove("start-rec");

      // ── WAV download ─────────────────────────────────────────────────
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const now = new Date();
      const datetime = `${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}_${now.getHours()}-${now.getMinutes()}`;
      const link = document.createElement("a");

      link.href = audioUrl;
      link.download = "litePlay_" + datetime + ".wav";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(audioUrl);

      // ── MIDI download ───────────────────────────────────────────────
      midiRecorder.stop();
      if (midiRecorder._events.length > 0) {
        midiRecorder.buildAndDownload(`litePlay_${datetime}.mid`);
      } else {
        console.log("No MIDI events captured — skipping MIDI download.");
      }

      if (connectedCsoundNode && destNode) {
        connectedCsoundNode.disconnect(destNode);
      }

      if (resampleContext.state !== "closed") {
        resampleContext.close();
      }
    };

    mediaRecorder.start();
    // Start MIDI recording in sync with WAV recording
    midiRecorder.start();
    console.log("Recording started...");
  } catch (err) {
    console.error("Failed to start recording: ", err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    console.log("Recording stopped! Downloading sound file...");
  }
}

//add sample
document
  .getElementById("sample-btn")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!csound) {
      console.log("Start engine before uploading samples...");
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    await csound.fs.writeFile(fileName, new Uint8Array(arrayBuffer));
    const userSample = sample.create();
    csound.inputMessage(`i2 0 0.1 "${fileName}" 60 ${userSample.number}`);
    const varName = fileName.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_");
    window[varName] = userSample;
    console.log(
      `Successfully uploaded ${fileName}.\n Use '${varName}' to access it in your code.`,
    );
  });

// buttons actions
const runButton = document.querySelector("#run-btn");
runButton.addEventListener("click", runLP);

const stopButton = document.querySelector("#stop-btn");
stopButton.addEventListener("click", stopLP);

const saveButton = document.querySelector("#save-btn");
saveButton.addEventListener("click", saveCode);

const recButton = document.querySelector("#rec-btn");
recButton.addEventListener("click", startRecording);

const stopRecButton = document.querySelector("#stopRec-btn");
stopRecButton.addEventListener("click", stopRecording);

// Machine listening
const mlConsole = document.getElementById("ml-console");
let hasListenerStarted = false;

// Create the callback function to handle incoming data
function handleNewMusicalEvent(eventData) {
  const textOutput = `Event: [${eventData[0]}, ${eventData[1]}, ${eventData[2]}, ${eventData[3]}]\n`;

  const mlConsole = document.getElementById("ml-console");

  if (mlConsole) {
    mlConsole.value += textOutput;
    mlConsole.scrollTop = mlConsole.scrollHeight; // Auto-scroll to bottom
  } else {
    console.warn("Could not find the ML console in the HTML!");
  }
}

function startListener() {
  if (!window.audio_context) {
    console.error("Start the litePlay engine first!");
    return;
  }

  if (hasListenerStarted) return;

  const isNowListening = toggleListening(
    window.audio_context,
    handleNewMusicalEvent,
  );

  if (isNowListening) {
    hasListenerStarted = true;
    console.log("Machine Listening successfully running in background.");
  }
}

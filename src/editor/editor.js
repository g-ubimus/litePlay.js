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
// snippet palette
import { SNIPPET_CATEGORIES, buildInsertion } from "./snippets.js";

// override function to print output in console
const consoleOutput = document.getElementById("console-output");
let logEverything = false;
const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
  originalLog.apply(console, args);
  if (!logEverything) return;
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

function clearConsole() {
  return (document.getElementById("console-output").value = "");
}

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

// import the static API index for completions and signatures
import { LP_INDEX, NOTE_FAMILY } from "../agent/lpIndex.js";
import {
  GLOBAL_ENTRIES,
  detectLanguage,
  matches,
  normalize,
  pickLabel,
} from "../agent/lpIndex.query.js";
import { midiRecorder } from "../core/litePlay.js";
import * as extra from "../core/extra.js";

// Concrete note names still come from the classic constants script; the index
// only describes what they mean.
const noteNames = Object.keys(window.lpAutocomplete ?? {}).filter((name) =>
  NOTE_FAMILY.pattern.test(name),
);

const signaturesByName = new Map();
for (const item of LP_INDEX) {
  if (!item.signature) continue;
  const names = [item.name, ...item.alias.en, ...item.alias.pt];
  for (const name of names) {
    if (!signaturesByName.has(name)) signaturesByName.set(name, item.signature);
  }
}

function completionType(item) {
  if (item.kind === "function") return "function";
  if (item.kind === "class") return "class";
  if (item.kind === "namespace") return "namespace";
  if (item.kind === "constant" || item.kind === "family") return "constant";
  if (item.kind === "instrument") return "variable";
  return "variable";
}

function completionRank(item, typed) {
  const needle = normalize(typed);
  const name = normalize(item.name);
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  if (item.alias.en.some((alias) => normalize(alias).startsWith(needle))) return 2;
  if (item.alias.pt.some((alias) => normalize(alias).startsWith(needle))) return 3;
  return 4;
}

function litePlayCompletions(context) {
  const word = context.matchBefore(/[\p{L}0-9_]+/u);
  if (!word && !context.explicit) return null;

  const typed = word ? word.text : "";
  const language = detectLanguage(context.state.doc.toString());
  const ranked = [];

  for (const item of GLOBAL_ENTRIES) {
    if (item.kind === "family") continue;
    if (!matches(item, typed)) continue;
    const label = pickLabel(item, typed, language);
    ranked.push({
      rank: completionRank(item, typed),
      label,
      option: {
        label,
        type: completionType(item),
        detail: item.signature ?? item.category,
        info: item.summary || undefined,
        apply: label,
      },
    });
  }

  const needle = normalize(typed);
  for (const name of noteNames) {
    if (needle && !normalize(name).startsWith(needle)) continue;
    ranked.push({
      rank: normalize(name) === needle ? 0 : 4,
      label: name,
      option: { label: name, type: "constant", detail: "MIDI note" },
    });
  }

  ranked.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));

  return {
    from: word ? word.from : context.pos,
    options: ranked.map((item) => item.option),
    filter: false,
  };
}

// help system

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
  const signature = signaturesByName.get(funcName);
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
        { key: "Mod-k", run: clearConsole },
      ]),
    ),
  ],
});

let editor = new EditorView({
  state: startState,
  parent: document.getElementById("editor-container"),
});

// snippet palette: click a card to insert working code
function insertSnippet(code) {
  const doc = editor.state.doc.toString();
  const cursorPos = editor.state.selection.main.head;
  const { from, to, insert, cursor } = buildInsertion(doc, cursorPos, code);

  editor.dispatch({
    changes: { from, to, insert },
    selection: { anchor: cursor },
  });
  editor.focus();

  const editorContainer = document.getElementById("editor-container");
  if (editorContainer) {
    editorContainer.classList.add("snippet-flash");
    setTimeout(() => editorContainer.classList.remove("snippet-flash"), 600);
  }
}

function buildSnippetPalette() {
  const list = document.getElementById("snippet-list");
  if (!list) return;

  SNIPPET_CATEGORIES.forEach((category, index) => {
    const details = document.createElement("details");
    details.className = "snippet-category";
    details.dataset.categoryId = category.id;
    if (index === 0) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = category.title;
    details.appendChild(summary);

    category.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "snippet-item";
      row.dataset.searchText = `${item.label} ${item.description || ""}`
        .trim()
        .toLowerCase();

      const insertBtn = document.createElement("button");
      insertBtn.className = "snippet-insert";
      insertBtn.title = "Insert into your code";
      if (item.description) {
        insertBtn.innerHTML =
          `<span class="snippet-label"></span>` +
          `<span class="snippet-desc"></span>`;
        insertBtn.querySelector(".snippet-label").textContent = item.label;
        insertBtn.querySelector(".snippet-desc").textContent = item.description;
      } else {
        insertBtn.innerHTML = `<span class="snippet-label"></span>`;
        insertBtn.querySelector(".snippet-label").textContent = item.label;
      }
      insertBtn.addEventListener("click", () => insertSnippet(item.code));

      const runBtn = document.createElement("button");
      runBtn.className = "snippet-run";
      runBtn.title = "Insert and run now";
      runBtn.setAttribute("aria-label", `Insert and run: ${item.label}`);
      runBtn.textContent = "▶";
      runBtn.addEventListener("click", () => {
        insertSnippet(item.code);
        runLP();
      });

      row.appendChild(insertBtn);
      row.appendChild(runBtn);
      details.appendChild(row);
    });

    list.appendChild(details);
  });
}

buildSnippetPalette();

// snippet search: filter cards by label/description, auto-expanding matches
const snippetSearch = document.getElementById("snippet-search");
if (snippetSearch) {
  snippetSearch.addEventListener("input", () => {
    const query = snippetSearch.value.trim().toLowerCase();
    const categories = document.querySelectorAll(".snippet-category");

    categories.forEach((category) => {
      let categoryHasMatch = false;
      category.querySelectorAll(".snippet-item").forEach((row) => {
        const matches = query === "" || row.dataset.searchText.includes(query);
        row.classList.toggle("no-match", !matches);
        if (matches) categoryHasMatch = true;
      });
      category.classList.toggle("no-match", !categoryHasMatch);
      if (query !== "") category.open = categoryHasMatch;
      else category.open = category.dataset.categoryId === "basics";
    });
  });
}

// snippet panel show/hide toggle
const snippetPanel = document.getElementById("snippet-panel");
const snippetToggleBtn = document.getElementById("snippet-toggle-btn");
const snippetCloseBtn = document.getElementById("snippet-close-btn");
if (snippetPanel && snippetToggleBtn) {
  snippetToggleBtn.addEventListener("click", () => {
    snippetPanel.classList.toggle("hidden");
  });
}
if (snippetPanel && snippetCloseBtn) {
  snippetCloseBtn.addEventListener("click", () => {
    snippetPanel.classList.add("hidden");
  });
}

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
        console.log("litePlay is ready!");

        // change button colors when ready
        const runBtn = document.getElementById("run-btn");
        if (runBtn) runBtn.classList.add("ready-green");

        //const recBtn = document.getElementById("rec-btn");
        //if (recBtn) recBtn.classList.add("ready-red");
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
      console.log("WAV file downloaded: " + link.download);
      link.remove();
      URL.revokeObjectURL(audioUrl);

      // ── MIDI download ───────────────────────────────────────────────
      midiRecorder.stop();
      try {
        if (midiRecorder._events.length > 0) {
          midiRecorder.buildAndDownload(`litePlay_${datetime}.mid`);
        } else {
          console.log("No MIDI events captured — skipping MIDI download.");
        }
      } catch (err) {
        console.error("Failed to build or download MIDI file:", err);
      }

      if (connectedCsoundNode && destNode) {
        connectedCsoundNode.disconnect(destNode);
      }

      if (resampleContext.state !== "closed") {
        resampleContext.close();
      }
    };

    mediaRecorder.start();
    const recBtn = document.getElementById("rec-btn");
    if (recBtn) recBtn.classList.add("start-rec");
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

const logCheckbox = document.querySelector("#log-check");
if (logCheckbox) {
  logCheckbox.addEventListener("change", () => {
    console.log("console.log: disabled");
    logEverything = logCheckbox.checked;
  });
}

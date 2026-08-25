# litePlay.js

This repo contains the source files for litePlay.js, an experimental platform
for lite coding, is based on the following off-the-shelf technologies

- Csound
- JavaScript/Web Audio

There is no need to install anything, as the system is designed to be
served from online sources and runs inside your browser.

A dedicated online editor for litePlay is available
[here](https://g-ubimus.github.io/litePlay.js/).

LitePlay's [documentation](https://g-ubimus.github.io/litePlay.docs/) is
available both in English and Portuguese. This is a work-in-progress, which
aims to cover the complete system.

## Loading it on a web page

To use it in a web page, add this tag to the HTML page header:

```
<script  src="https://g-ubimus.github.io/litePlay.js/src/core/litePlay.constants.js"></script>
```

You can start by looking at the following example sketches in the P5.js editor:

[Introducing litePlay.js](https://editor.p5js.org/vlazzarini/sketches/gSpXKc2sX)

[Sequencer example](https://editor.p5js.org/vlazzarini/sketches/c4PhzF39r)

To play the default piano sound in litePlay, try:

```JavaScript
function f() {
	lp.play(C4);
}

lpRun(f);
```

## Running locally

To run the project locally, you need to spin up a quick web server.

**Prerequisites:**

- You must have [Node.js](https://nodejs.org/) installed on your computer.

**Steps to run:**

1. **Open your terminal** on the root folder of this repository.
2. **Start the local server** by running the following command (no installation
   required):

```bash
npx serve
```

3. In this context, all litePlay's exports are available to use without the
   need to add its prefix:

```JavaScript
play(C4);
```

## Signal Modifiers (effects)

Every instrument also supports a growing set of Csound's
[Signal Modifiers](https://csound.com/docs/manual/SigmodTop.html) — distortion,
filters, a compressor, tremolo, ring modulation, flanger/chorus/phaser, comb
filtering, sample & hold, and reverb tone shaping — as plain methods like
`piano.distortion(0.6)`. See [SIGNAL_MODIFIERS.md](SIGNAL_MODIFIERS.md) for
the full list and usage demos.

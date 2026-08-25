# Signal Modifiers for litePlay.js

litePlay's whole idea is that you get Csound's synthesis engine without ever
touching Csound syntax: you write small, readable JavaScript, and the engine
that plays it back happens to be Csound running as WebAssembly in your
browser. Every existing effect works the same way — `piano.reverb(0.4)`,
`piano.cutoff(0.6)`, `piano.pan(-0.5)` — a friendly method call on an
instrument sets one number in a per-channel Csound function table, and a
fixed, always-running orchestra (`src/core/litePlay.csd`) reads that table on
every note.

Csound's own manual groups a large family of DSP building blocks under
[**Signal Modifiers**](https://csound.com/docs/manual/SigmodTop.html) —
filters, distortion, dynamics processors, modulated-delay effects, and more.
This document covers the subset of that group now wired into litePlay the
same lite-coding way as everything else: one method, one knob, no Csound
syntax required.

- [Quick reference](#quick-reference)
- [Waveshaping and Phase Distortion — `distortion()`](#waveshaping-and-phase-distortion)
- [Standard Filters — `highpass()`](#standard-filters)
- [Specialized Filters — `moogFilter()`, `combFilter()`](#specialized-filters)
- [Amplitude Modifiers and Dynamic Processing — `compressor()`, `tremolo()`](#amplitude-modifiers-and-dynamic-processing)
- [Special Effects — `ringModulate()`, `flanger()`, `chorus()`, `phaser()`](#special-effects)
- [Sample Level Operators — `sampleHold()`](#sample-level-operators)
- [Reverberation — `reverbTone()`](#reverberation)
- [What's not in here yet](#whats-not-in-here-yet)

All of these are methods on any litePlay `Instrument` (`piano`, `guitar`,
`drums`, an instrument you built with `sample.create()`, anything returned by
`onSomething()` and friends) unless noted otherwise, so they compose with
everything litePlay already does — the sequencer, `eventList`, `arpeggio()`,
MIDI recording, all of it. Every one of them defaults to *silent/off*: adding
this file to a project changes nothing about how existing sketches sound.

## Quick reference

| Method | Csound category | Csound opcode(s) |
|---|---|---|
| `instrument.distortion(amount)` | Waveshaping and Phase Distortion | [`distort`](https://csound.com/docs/manual/distort.html) |
| `instrument.highpass(cutoff)` | Standard Filters | [`atone`](https://csound.com/docs/manual/atone.html) |
| `instrument.moogFilter(cutoff, resonance)` | Specialized Filters | [`moogladder`](https://csound.com/docs/manual/moogladder.html) |
| `instrument.compressor(amount, threshold)` | Amplitude Modifiers and Dynamic Processing | [`dam`](https://csound.com/docs/manual/dam.html) |
| `instrument.tremolo(rate, depth)` | Amplitude Modifiers and Dynamic Processing | [`oscili`](https://csound.com/docs/manual/oscili.html) |
| `instrument.ringModulate(frequency, mix)` | Special Effects | [`oscili`](https://csound.com/docs/manual/oscili.html) |
| `instrument.sampleHold(rate, mix)` | Sample Level Operators | [`samphold`](https://csound.com/docs/manual/samphold.html), [`mpulse`](https://csound.com/docs/manual/mpulse.html) |
| `instrument.flanger(rate, depth, feedback)` / `.noFlanger()` | Special Effects | [`flanger`](https://csound.com/docs/manual/flanger.html) |
| `instrument.chorus(rate, depth)` / `.noChorus()` | Special Effects | [`flanger`](https://csound.com/docs/manual/flanger.html) |
| `instrument.phaser(rate, stages, feedback)` / `.noPhaser()` | Special Effects | [`phaser1`](https://csound.com/docs/manual/phaser1.html) |
| `instrument.combFilter(decay, delayTime)` / `.noCombFilter()` | Specialized Filters | [`comb`](https://csound.com/docs/manual/comb.html) |
| `reverbTone(size, damping)` (global, not per-instrument) | Reverberation | [`freeverb`](https://csound.com/docs/manual/freeverb.html) |

## Waveshaping and Phase Distortion

**`instrument.distortion(amount)`** — `amount` from `0` (clean) to `1` (fully
driven). Runs the signal through a Csound waveshaping table via
[`distort`](https://csound.com/docs/manual/distort.html); `amount` is really a
dry/wet crossfade into that waveshaper, so `0` is always an exact bypass.

```JavaScript
function f() {
  guitar.distortion(0.7);
  play(E2);
}
lpRun(f);
```

## Standard Filters

**`instrument.highpass(cutoff)`** — `cutoff` from `0` (off) to `1` (brightest,
thinnest). This sits alongside the lowpass `cutoff()`/`resonance()` litePlay
already has; use both together to carve a band out of a sound.

```JavaScript
function f() {
  piano.highpass(0.4);
  play(C4);
}
lpRun(f);
```

## Specialized Filters

**`instrument.moogFilter(cutoff, resonance)`** — a second filter character,
the classic Moog ladder lowpass ([`moogladder`](https://csound.com/docs/manual/moogladder.html)),
distinct from the existing `cutoff()`/`resonance()` pair. `cutoff` is `0`-`1`
(`1` = wide open, the default), `resonance` is `0`-`1`ish and can self-oscillate
if you push it past `1` (capped at `4`). Unlike the other effects here, this
one has no fully-neutral "off" state: the ladder's stages always run the
signal through a soft saturation, so even at the default `cutoff`/`resonance`
it colors the sound a little — that's the character of the filter, not a bug.

```JavaScript
function f() {
  synth.moogFilter(0.3, 0.85);
  play(C3);
}
lpRun(f);
```

**`instrument.combFilter(decay, delayTime)`** / **`instrument.noCombFilter()`**
— a resonant comb filter ([`comb`](https://csound.com/docs/manual/comb.html))
that turns any note into a ringing, metallic/pitched resonance. `decay` is the
reverberation time in seconds (`0` turns it off), `delayTime` sets the comb
spacing in seconds (defaults to `0.01`, i.e. roughly a 100 Hz comb).

```JavaScript
function f() {
  marimba.combFilter(2, 0.015);
  play(C4);
}
lpRun(f);

// later
marimba.noCombFilter();
```

## Amplitude Modifiers and Dynamic Processing

**`instrument.compressor(amount, threshold = 0.3)`** — a dynamics
compressor ([`dam`](https://csound.com/docs/manual/dam.html)). `amount` from
`0` (off) to `1` (heavily compressed) squeezes everything above `threshold`
(`0`-`1`) down toward it — handy for keeping a drum part punchy and consistent.

```JavaScript
function f() {
  drums.compressor(0.6, 0.25);
  play(kick);
}
lpRun(f);
```

**`instrument.tremolo(rate, depth)`** — a classic amplitude LFO. `rate` in Hz,
`depth` from `0` (off) to `1` (full on/off pulsing).

```JavaScript
function f() {
  organ.tremolo(6, 0.6);
  play(G3);
}
lpRun(f);
```

## Special Effects

**`instrument.ringModulate(frequency, mix = 1)`** — true ring modulation:
multiplying the signal by a sine carrier at `frequency` Hz, which is a
different, harsher animal from litePlay's existing `shift()` (a single-sideband
*frequency* shift built on a Hilbert transform). Great for bells, clangs, and
robot voices. `mix` blends dry/wet, `0` is off.

```JavaScript
function f() {
  bell.ringModulate(233, 0.8);
  play(C5);
}
lpRun(f);
```

**`instrument.flanger(rate, depth, feedback)`** / **`.noFlanger()`** — a
classic sweeping comb-like flange via Csound's built-in
[`flanger`](https://csound.com/docs/manual/flanger.html) opcode. `rate` in Hz,
`depth` in seconds (kept small — try `0.002`–`0.01`), `feedback` from `-0.95`
to `0.95`.

```JavaScript
function f() {
  guitar.flanger(0.3, 0.006, 0.7);
  play([E3, 1, 0, 4]);
}
lpRun(f);

// later
guitar.noFlanger();
```

**`instrument.chorus(rate, depth)`** / **`.noChorus()`** — the same modulated
delay idea as `flanger()`, but with a longer delay range and no feedback,
which is what turns "flange" into "chorus": a thicker, wider, gently detuned
doubling rather than a metallic sweep.

```JavaScript
function f() {
  strings.chorus(0.25, 0.02);
  play([C4, 1, 0, 4]);
}
lpRun(f);
```

**`instrument.phaser(rate, stages = 4, feedback = 0.7)`** / **`.noPhaser()`**
— a sweeping series of notches via
[`phaser1`](https://csound.com/docs/manual/phaser1.html). `stages` (the
number of allpass stages, in steps of 2 = number of notches) is fixed for as
long as the phaser stays on; `rate` and `feedback` can change while it runs.

```JavaScript
function f() {
  pad1.phaser(0.4, 6, 0.85);
  play([C3, 1, 0, 6]);
}
lpRun(f);

// later
pad1.noPhaser();
```

> `flanger()`, `chorus()`, `phaser()` and `combFilter()` are *per-channel bus*
> effects, exactly like litePlay's existing `delay()`: calling them starts a
> small always-on Csound instrument for that instrument's channel, and
> `noFlanger()`/`noChorus()`/`noPhaser()`/`noCombFilter()` stops it again. That
> matches `delay()`/`noDelay()` and keeps the cost of an unused effect at
> exactly zero.

## Sample Level Operators

**`instrument.sampleHold(rate, mix = 1)`** — a lo-fi sample & hold
([`samphold`](https://csound.com/docs/manual/samphold.html) driven by
[`mpulse`](https://csound.com/docs/manual/mpulse.html)) that freezes the
signal into steps at `rate` Hz — the classic "crunchy," stepped/aliased
lo-fi texture. Low rates (a few Hz) sound broken-radio glitchy; higher rates
(hundreds of Hz) sound like gritty bit-reduction. `mix` blends dry/wet.

```JavaScript
function f() {
  synth.sampleHold(9, 0.7);
  play(A3);
}
lpRun(f);
```

## Reverberation

litePlay already has per-instrument `reverb(amount)` (how much of *that*
instrument's sound is sent to the shared reverb). **`reverbTone(size, damping)`**
is new and global — it shapes the *character* of that one shared reverb tail
via [`freeverb`](https://csound.com/docs/manual/freeverb.html)'s own room-size
and high-frequency-damping controls, for every instrument at once.

```JavaScript
function f() {
  piano.reverb(0.8);
  reverbTone(0.9, 0.1); // bigger, brighter tail for everyone
  play(C4);
}
lpRun(f);
```

`size` and `damping` are both `0`-`1`; the defaults (`0.7`, `0.35`) match
litePlay's original, unconfigurable reverb exactly, so calling this is
entirely optional.

## What's not in here yet

Csound's Signal Modifiers page also lists a few groups that don't fit
litePlay's current shape, deliberately left out rather than shipped half-working:

- **Convolution and Morphing** (`ftconv`, `pconvolve`, `dconv`) — real
  convolution reverb needs an impulse-response audio file loaded in, the same
  way `sample.load()` loads a sample. That's a natural next step (imagine
  `instrument.convolve(irFile)`), but it's a bigger, separate feature — new
  asset loading, plus a CPU cost per active convolution that needs real
  headroom testing — not a single opcode to wire in.
- **Signal Limiters** (`limit`, `mirror`, and friends) — in Csound these
  clamp/fold a control *value*, not audio; there's no user-facing "limiter
  knob" to expose here that isn't just another distortion/compressor variant,
  which are covered above.
- **Waveguides** (`wguide1`, `streson`, physical modeling) — these model the
  physical body of an instrument reacting to an excitation signal, which
  doesn't map cleanly onto litePlay's GM-soundfont-plus-effects note model
  without a much larger rethink of how a note gets triggered.

If you build one of these, the existing methods above are the template to
follow: one Csound opcode (or a small UDO), one or two per-channel function
tables, a method on `Instrument` that defaults to an exact bypass, and a demo
here.

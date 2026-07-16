// Check if the environment is local/development
const isLocalEnv =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.protocol === "file:";

let baseURL = null;
let lp_URL = null;
let extra_URL = null;

if (isLocalEnv === true) {
  baseURL = "./";
  lp_URL = baseURL + "litePlay.js";
  extra_URL = baseURL + "extra.js";
} else {
  baseURL = "https://g-ubimus.github.io/litePlay.js/src/core/";
  lp_URL = baseURL + "litePlay.js";
  extra_URL = baseURL + "extra.js";
}

// MIDI NOTE constants
const djScratch = 29;
const acousticBassDrum = 35;
const kick = acousticBassDrum;
const bassDrum1 = 36;
const bassDrum = bassDrum1;
const sideStick = 37;
const acousticSnare = 38;
const handClap = 39;
const clap = handClap;
const electricSnare = 40;
const snare = electricSnare;
const lowFloorTom = 41;
const closedHiHat = 42;
const highFloorTom = 43;
const pedalHiHat = 44;
const lowTom = 45;
const tom = lowTom;
const openHiHat = 46;
const lowMidTom = 47;
const hiMidTom = 48;
const crashCymbal = 49;
const crash = crashCymbal;
const hiTom = 50;
const rideCymbal1 = 51;
const cymbal = rideCymbal1;
const chineseCymbal = 52;
const rideBell = 53;
const tambourine = 54;
const splashCymbal = 55;
const cowbell = 56;
const crashCymbal2 = 57;
const vibraslap = 58;
const rideCymbal2 = 59;
const hiBongo = 60;
const lowBongo = 61;
const muteHiConga = 62;
const openHiConga = 63;
const lowConga = 64;
const hiTimbale = 65;
const lowTimbale = 66;
const hiAgogo = 67;
const lowAgogo = 68;
const cabasa = 69;
const maracas = 70;
const longWhistle = 71;
const shortWhistle = 72;
const shortGuiro = 73;
const longGuiro = 74;
const claves = 75;
const hiWoodBlock = 76;
const lowWoodBlock = 77;
const muteCuica = 78;
const openCuica = 79;
const muteTriangle = 80;
const openTriangle = 81;

function notes(start) {
  let l = [];
  for (let i = start; i < 127; i += 12) l.push(i);
  return l;
}

const C = notes(0);
const C0 = C[1],
  C1 = C[2],
  C2 = C[3],
  C3 = C[4],
  C4 = C[5],
  C5 = C[6],
  C6 = C[7],
  C7 = C[8],
  C8 = C[9],
  Cm1 = C[0];
const Cs = notes(1);
const Cs0 = Cs[1],
  Cs1 = Cs[2],
  Cs2 = Cs[3],
  Cs3 = Cs[4],
  Cs4 = Cs[5],
  Cs5 = Cs[6],
  Cs6 = Cs[7],
  Cs7 = Cs[8],
  Cs8 = Cs[9],
  Csm1 = Cs[0];
const Db = Cs;
const Db0 = Db[1],
  Db1 = Db[2],
  Db2 = Db[3],
  Db3 = Db[4],
  Db4 = Db[5],
  Db5 = Db[6],
  Db6 = Db[7],
  Db7 = Db[8],
  Db8 = Db[9],
  Dbm1 = Db[0];
const D = notes(2);
const D0 = D[1],
  D1 = D[2],
  D2 = D[3],
  D3 = D[4],
  D4 = D[5],
  D5 = D[6],
  D6 = D[7],
  D7 = D[8],
  D8 = D[9],
  Dm1 = D[0];
const Ds = notes(3);
const Ds0 = Ds[1],
  Ds1 = Ds[2],
  Ds2 = Ds[3],
  Ds3 = Ds[4],
  Ds4 = Ds[5],
  Ds5 = Ds[6],
  Ds6 = Ds[7],
  Ds7 = Ds[8],
  Ds8 = Ds[9],
  Dsm1 = Ds[0];
const Eb = Ds;
const Eb0 = Eb[1],
  Eb1 = Eb[2],
  Eb2 = Eb[3],
  Eb3 = Eb[4],
  Eb4 = Eb[5],
  Eb5 = Eb[6],
  Eb6 = Eb[7],
  Eb7 = Eb[8],
  Eb8 = Eb[9],
  Ebm1 = Eb[0];
const E = notes(4);
const E0 = E[1],
  E1 = E[2],
  E2 = E[3],
  E3 = E[4],
  E4 = E[5],
  E5 = E[6],
  E6 = E[7],
  E7 = E[8],
  E8 = E[9],
  Em1 = E[0];
const Es = notes(5);
const Es0 = Es[1],
  Es1 = Es[2],
  Es2 = Es[3],
  Es3 = Es[4],
  Es4 = Es[5],
  Es5 = Es[6],
  Es6 = Es[7],
  Es7 = Es[8],
  Es8 = Es[9],
  Esm1 = Es[0];
const F = Es;
const F0 = F[1],
  F1 = F[2],
  F2 = F[3],
  F3 = F[4],
  F4 = F[5],
  F5 = F[6],
  F6 = F[7],
  F7 = F[8],
  F8 = F[9],
  Fm1 = F[0];
const Fs = notes(6);
const Fs0 = Fs[1],
  Fs1 = Fs[2],
  Fs2 = Fs[3],
  Fs3 = Fs[4],
  Fs4 = Fs[5],
  Fs5 = Fs[6],
  Fs6 = Fs[7],
  Fs7 = Fs[8],
  Fs8 = Fs[9],
  Fsm1 = Fs[0];
const Gb = Fs;
const Gb0 = Gb[1],
  Gb1 = Gb[2],
  Gb2 = Gb[3],
  Gb3 = Gb[4],
  Gb4 = Gb[5],
  Gb5 = Gb[6],
  Gb6 = Gb[7],
  Gb7 = Gb[8],
  Gb8 = Gb[9],
  Gbm1 = Gb[0];
const G = notes(7);
const G0 = G[1],
  G1 = G[2],
  G2 = G[3],
  G3 = G[4],
  G4 = G[5],
  G5 = G[6],
  G6 = G[7],
  G7 = G[8],
  G8 = G[9],
  Gm1 = G[0];
const Gs = notes(8);
const Gs0 = Gs[1],
  Gs1 = Gs[2],
  Gs2 = Gs[3],
  Gs3 = Gs[4],
  Gs4 = Gs[5],
  Gs5 = Gs[6],
  Gs6 = Gs[7],
  Gs7 = Gs[8],
  Gsm1 = Gs[0];
const Ab = Gs;
const Ab0 = Ab[1],
  Ab1 = Ab[2],
  Ab2 = Ab[3],
  Ab3 = Ab[4],
  Ab4 = Ab[5],
  Ab5 = Ab[6],
  Ab6 = Ab[7],
  Ab7 = Ab[8],
  Abm1 = Ab[0];
const A = notes(9);
const A0 = A[1],
  A1 = A[2],
  A2 = A[3],
  A3 = A[4],
  A4 = A[5],
  A5 = A[6],
  A6 = A[7],
  A7 = A[8],
  Am1 = A[0];
const As = notes(10);
const As0 = As[1],
  As1 = As[2],
  As2 = As[3],
  As3 = As[4],
  As4 = As[5],
  As5 = As[6],
  As6 = As[7],
  As7 = As[8],
  Asm1 = As[0];
const Bb = As;
const Bb0 = Bb[1],
  Bb1 = Bb[2],
  Bb2 = Bb[3],
  Bb3 = Bb[4],
  Bb4 = Bb[5],
  Bb5 = Bb[6],
  Bb6 = Bb[7],
  Bb7 = Bb[8],
  Bbm1 = Bb[0];
const B = notes(11);
const B0 = B[1],
  B1 = B[2],
  B2 = B[3],
  B3 = B[4],
  B4 = B[5],
  B5 = B[6],
  B6 = B[7],
  B7 = B[8],
  Bm1 = B[0];
const Bs = C;
const Bs0 = Bs[1],
  Bs1 = Bs[2],
  Bs2 = Bs[3],
  Bs3 = Bs[4],
  Bs4 = Bs[5],
  Bs5 = Bs[6],
  Bs6 = Bs[7],
  Bs7 = Bs[8],
  Bs8 = Bs[9],
  Bsm1 = Bs[0];
const O = -999;

const quarterTone = 0.5;
const thirdTone = 0.333;
const eighthTone = 0.25;
const tenCent = 0.1;
const oneCent = 0.01;

const lpRun = async (code = null) => {
  try {
    const val = await import(lp_URL);
    const extra = await import(extra_URL);
    window.lp = { ...val, ...extra };
    await val.startEngine();
    if (typeof code === "function") code();
    else console.log("litePlay.js: running\n");
  } catch (err) {
    console.error("litePlay: Could not run engine", err);
  }
};

const lpLoad = async () => {
  let lpModule = await import(lp_URL);
  let extraModule = await import(extra_URL);
  await lpModule.startEngine();
  return { ...lpModule, ...extraModule };
};

// interface em Portugues
async function leveToque(codigo = null) {
  window.lt = await lpLoad();
  if (typeof codigo === "function") codigo();
}

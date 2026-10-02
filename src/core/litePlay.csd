<CsoundSynthesizer>
<CsOptions>
-odac -d 
</CsOptions>
<CsInstruments>
nchnls = 2
nchnls_i = 1
ksmps = 64
0dbfs = 1
sr = 44100
/* topmost cf: maps a normalised 0-1 cutoff onto Hz for the exponential
filter-cutoff mappings below (vclpf-based lowpass, plus the new HighPass and
MoogFilter Signal Modifiers). Must be defined here, before first use, since
Csound's compiler resolves a global variable's rate/value in file order -
referencing it from an opcode defined earlier in the file (even though the
opcode itself is only CALLED later, at performance time) still fails to
compile with "Variable 'gicf' used before defined". */
gicf = log(sr/2)

ichn = 1
lp1: massign   ichn, 0
loop_le   ichn, 1, 16, lp1
pgmassign 0, 0
gisf sfload "gm.sf2"
sfpassign  0, gisf

//master output
gaLeft init 0
gaRight init 0
maxalloc 110, 1

//reverb 
garev1 init 0
garev2 init 0

//delay
gadel[] init 100

//chorus
gachorus[] init 100

//tab 28: frequency shift (+-freq)
opcode Shift, aa, aak
	ain1, ain2, kval xin
	areal1, aimag1 hilbert ain1
	areal2, aimag2 hilbert ain2
	asin oscili 1, kval, 29
	acos oscili 1, kval, 29, .25
	aout1 = (areal1*acos - aimag1*asin)
	aout2 = (areal2*acos - aimag2*asin)
	xout aout1, aout2
endop

//table 35: distortion (0-1)
opcode Distort, aa, aak
	ain1, ain2, kchn xin
	kdrive table kchn, 34
	ad1 distort ain1, kdrive, 40 
	ad2 distort ain2, kdrive, 40 
	aout1 = ain1*(1-kdrive) + ad1*kdrive
	aout2 = ain2*(1-kdrive) + ad2*kdrive
	xout aout1, aout2
endop

//table 35: cutoff (0-1, 0 = transparent/off, 1 = brightest)
opcode HighPass, aa, aak
	ain1, ain2, kchn xin
	kcut table kchn, 35
	khp = kcut > 0 ? exp((kcut < 1 ? kcut : 1)*gicf) : 1
	ah1 atone ain1, khp
	ah2 atone ain2, khp
	aout1 = kcut > 0 ? ah1 : ain1
	aout2 = kcut > 0 ? ah2 : ain2
	xout aout1, aout2
endop

//table 36: rate in Hz; table 37: depth (0-1, 0 = exact bypass)
opcode Tremolo, aa, aak
	ain1, ain2, kchn xin
	krate table kchn, 36 
	kdepth table kchn, 37 
	klfo oscili kdepth, krate, 33
	kenv = 1 - kdepth*0.5 + klfo
	xout ain1*kenv, ain2*kenv
endop

//---------------------------------------------
// this instrument parses MIDI input
//   to trigger the GM soundfont synthesis
//   instrument (instr 10)
instr 1
	idkit = 317 /* drum-kit preset was 317*/
	tableiw idkit, 9, 1
	irel = 0.5 /* release envelope */
	
	ipg = 1
	ivol = 2
	ipan = 3

nxt:
  kst, kch, kd1, kd2 midiin

  if (kst != 0) then
    kch = kch - 1
    if (kst == 144 && kd2 != 0) then ; note on
        kpg table kch, ipg 
        /* instrument identifier is 10.[chn][note] */
        kinst = 10 + kd1/1000000 + kch/1000  
        if kch == 9 then
         /* exclusive identifiers */
         if kpg == idkit+7 then
           krel = 2    /* add extra release time for orch perc*/
         else
           krel = 0.5
         endif
         tablew krel,kch,26
         if (kd1 == 29 || kd1 == 30) then ; EXC7
          kinst = 10.97
         elseif (kd1 == 42 || kd1 == 44 || kd1 == 46 || kd1 == 49) then ; EXC1
           kinst = 10.91
         elseif (kd1 == 71 || kd1 == 72) then ; EXC2         
           kinst = 10.92
         elseif (kd1 == 73 || kd1 == 74) then ; EXC3         
           kinst = 10.93
         elseif (kd1 == 78 || kd1 == 79) then ; EXC4         
           kinst = 10.94
         elseif (kd1 == 80 || kd1 == 81) then ; EXC5         
           kinst = 10.95
         elseif (kd1 == 86 || kd1 == 87) then ; EXC6         
           kinst = 10.96
         endif
        else
         krel = 0.5
        endif
        event "i", kinst, 0, -1, kd1, kd2, kpg, kch
        tablew 1,kd1,7
     
    elseif (kst == 128 || (kst == 144 && kd2 == 0)) then ; note off
        kpg table kch, ipg
        kinst = 10 +  kd1/1000000 + kch/1000
        if kch == 9 then
         if (kd1 == 29 || kd1 == 30) then ; EXC7
          kinst = 10.97
         elseif (kd1 == 42 || kd1 == 44 || kd1 == 46 || kd1 == 49) then ; EXC1
           kinst = 10.91
         elseif (kd1 == 71 || kd1 == 72) then ; EXC2         
           kinst = 10.92
         elseif (kd1 == 73 || kd1 == 74) then ; EXC3         
           kinst = 10.93
         elseif (kd1 == 78 || kd1 == 79) then ; EXC4         
           kinst = 10.94
         elseif (kd1 == 80 || kd1 == 81) then ; EXC5         
           kinst = 10.95
         elseif (kd1 == 86 || kd1 == 87) then ; EXC6         
           kinst = 10.96
         endif
        else
         kpg = 0
        endif
        event "i", -kinst, 0, 1
        tablew 0,kd1,7
     
    elseif (kst == 192) then /* program change msgs */
       if kch == 9 then
         kpg = idkit
         if kd1 == 8 then
         kpg = idkit+1
         elseif kd1 == 16 then
         kpg = idkit+2
         elseif kd1 == 24 then
         kpg = idkit+3
         elseif kd1 == 25 then
         kpg = idkit+4
         elseif kd1 == 32 then
         kpg = idkit+5
         elseif kd1 == 40 then
         kpg = idkit+6
         elseif kd1 == 48 then
         kpg = idkit+7
         endif
       else
       kpg = kd1 
       endif
       tablew  kpg, kch, ipg
    elseif (kst == 176 && kd1 == 11) then /* volume msgs */
       tablew kd2, kch, ivol
    elseif (kst == 176 && kd1 == 7) then /* pan msgs    */
       tablew kd2, kch, ipan
    endif
     kgoto nxt
  endif
endin

/* this is the GM soundfont synthesizer instrument */
instr 10
	iatt table p7,23
	idec table p7,24
	isus table p7,25
	irel table p7,26
	
	iamp tablei p5,6
	aenv madsr iatt+1/kr, idec, isus, irel
	imicro = 2^(frac(p4)/12)
	kbend table p7,14
	a1, a2 sfplay p5, int(p4), iamp*aenv*0.0002, imicro*kbend, p6, 0, 0, 2
	kv table p7, 2
	
	iatt table p7,19
	idec table p7,20
	isus table p7,21
	irel table p7,22
	kcfi table p7,17
	kres table p7,18
	kcfi += madsr(iatt+1/kr,idec,isus,irel)*table(p7,27)
	kcf = exp((kcfi < 1 ? kcfi : 1)*gicf)
	a1f vclpf a1,kcf,kres
	a2f vclpf a2,kcf,kres
	a1 = a1f
	a2 = a2f
	//frequency shifter
	kshift table p7,28
	a1, a2 Shift a1, a2, kshift
	//signal modifiers
	a1, a2 Distort a1, a2, p7
	a1, a2 HighPass a1, a2, p7
	a1, a2 Tremolo a1, a2, p7
	//panning
	kvol tablei kv, 5
	kpan  table p7, 3
	krate table p7, 32
	kbase = (kpan - 64)/128
	klfo  oscili 0.5, krate, 33
	kpan  = kbase + klfo
	a1 *= kvol*(0.5-kpan/2)
	a2 *= kvol*(0.5+kpan/2)
	//send to delay (gated on kdt so an inactive channel's bus never accumulates)
	kdt table p7,30
	if kdt > 0 then
		gadel[p7] = gadel[p7] + a1
		gadel[p7] = gadel[p7] + a2
	endif
	//send to chorus / comb-filter (each gated on its own
	//active-flag table so a channel that never enables an effect never
	//accumulates into that effect's bus)
	kchon table p7, 60
	if kchon > 0 then
		gachorus[p7] = gachorus[p7] + a1
		gachorus[p7] = gachorus[p7] + a2
	endif
	//send to reverb
	krev table p7,8
	garev1 += a1*krev
	garev2 += a2*krev

	//send to master
	gaLeft = gaLeft + a1
	gaRight = gaRight + a2
endin

// sample playback
instr 11
	irel table p7,26
	ifo table p6,10
	ifn table p6,9
	iamp table p5,6
	iln = ftlen(ifn)/(ftsr(ifn)*ftchnls(ifn))
	imicro = 2^(frac(p4)/12)
	ipitch = imicro*cpsmidinn(p4)/cpsmidinn(ifo)
	kstart table p6,11
	kend table p6,12
	kstart = kstart > 0 ? kstart : 0;
	klend = kend > 0 ? kend : iln;
	kfade table p6, 13
	kpitch table p7, 14
	kpan  table p7, 3
	krate table p7, 32
	kbase = (kpan - 64)/128
	klfo  oscili 0.5, krate, 33
	kpan  = kbase + klfo
	
	aenv linenr iamp,0,irel,0.01 
	if ftchnls(ifn) == 1 then
		a1 flooper2 iamp,ipitch*kpitch,kstart,klend,kfade,ifn
		a1 = a1*aenv
		a2 = a1*aenv
		else 
		a1,a2 flooper2 iamp,ipitch*kpitch,kstart,klend,kfade,ifn 
		a1 = a1*aenv
		a2 = a2*aenv
	endif

	a1 *= (0.5-kpan/2)
	a2 *= (0.5+kpan/2)
	krev table p7,8
	garev1 += a1*krev
	garev2 += a2*krev
		//send to master
		gaLeft = gaLeft + a1
		gaRight = gaRight + a2
	if kend == 0 then
		kend = (iln - irel*2.1)/(ipitch*kpitch)  
	 	if timeinsts() >= kend then
	  		turnoff 
	 	endif
	endif              
endin

// sample playback (spectral)
// p6 is pgm -> sample num
instr 12
	iatt table p7,23
	idec table p7,24
	isus table p7,25
	ire table p7,26
	ifo table p6,10
	ifn table p6,9
	iamp table p5,6
	iln = ftlen(ifn)/(ftsr(ifn)*ftchnls(ifn))
	imicro = 2^(frac(p4)/12)
	ipitch = imicro*cpsmidinn(p4)/cpsmidinn(ifo)
	kstart table p6,11
	kend table p6,12
	kstart = kstart > 0 ? kstart : 0;
	klend = kend > 0 ? kend : iln;
	kpitch table p7, 14
	//panning
	kpan  table p7, 3
	krate table p7, 32
	kbase = (kpan - 64)/128
	klfo  oscili 0.5, krate, 33
	kpan  = kbase + klfo
	ks0  table p6, 15  // sample speed ref per pgm
	ksp  table p7, 16  // playback speed per chn
	ksp *= ks0
	aph phasor ksp/(klend - kstart)
	atimpt = kstart + aph*(klend - kstart)
	aenv madsr iatt+1/kr, idec, isus, ire
	if ftchnls(ifn) == 1 then
		a1 mincer atimpt,iamp,ipitch*kpitch,ifn,1
		a1 = a1*aenv
		a2 = a1*aenv
	else 
		a1,a2 mincer atimpt,iamp,ipitch*kpitch,ifn,1 
		a1 = a1*aenv
		a2 = a2*aenv
	endif

	iatt table p7,19
	idec table p7,20
	isus table p7,21
	irel table p7,22
	kcfi table p7,17
	kres table p7,18
	kcfi += madsr(iatt+1/kr,idec,isus,irel)*table(p7,27)
	kcf = exp((kcfi < 1 ? kcfi : 1)*gicf)
	a1f vclpf a1,kcf,kres
	a2f vclpf a2,kcf,kres
	a1 = a1f
	a2 = a2f

	kshift table p7,28 //frequency shifter
	a1, a2 Shift a1, a2, kshift

	//signal modifiers
	a1, a2 Distort a1, a2, p7
	a1, a2 HighPass a1, a2, p7
	a1, a2 Tremolo a1, a2, p7

	a1 *= (0.5-kpan/2)
	a2 *= (0.5+kpan/2)
	//send to delay (gated on kdt so an inactive channel's bus never accumulates)
	kdt table p7,30
	if kdt > 0 then
		gadel[p7] = gadel[p7] + a1
		gadel[p7] = gadel[p7] + a2
	endif
	//send to  chorus (gated on its own active-flag table so a channel 
	//that never enables an effect never accumulates into that effect's bus)
	kchon table p7, 60
	if kchon > 0 then
		gachorus[p7] = gachorus[p7] + a1
		gachorus[p7] = gachorus[p7] + a2
	endif
	kcbon table p7, 62
	//send to reverb
	krev table p7,8
	garev1 += a1*krev
	garev2 += a2*krev

	//send to master
	gaLeft = gaLeft + (a1*.2)
	gaRight = gaRight + (a2*.2)
	if kend == 0 then
		kend = (iln - ire*2.1)/ksp;///(ipitch*ksp)  
		if timeinsts() >= kend then
			turnoff 
		endif
	endif              
endin

// loading tables
// i2 0 0 "sample" f0 pgm
instr 2
S1 = p4
ign ftgen 0,0,0,1,S1,0,0,0
tablew ign,p6,9
tablew p5,p6,10
endin

// loading a second soundfont bank (mirrors instr 2's dynamic sample
// loading above). p4 is a filename already materialized in the WASM
// filesystem; its presets land at preset index 1000+, comfortably clear of
// the built-in gm.sf2 bank's own used range (melodic 0-127, drum kit
// 317-444), so both banks stay addressable through the same sfplay call in
// instr 10 via one global preset index (see Instrument's bankOffset in
// litePlay.js).
// i3 0 0 "soundfont.sf2"
instr 3
Sfile = p4
gisf2 sfload Sfile
sfpassign 1000, gisf2
endin

// reverb
instr 100
	a1, a2 freeverb garev1, garev2, 0.7, 0.35	

	//send to master
	gaLeft = gaLeft + a1
	gaRight = gaRight + a2
	garev1 = 0
	garev2 = 0
endin

// delay
instr 105
	kdt table p4, 30
	kfb table p4, 31
	adl delayr 2.0
	aecho  deltapi kdt
	adel = gadel[p4] + aecho*kfb
	delayw adel
	gadel[p4] = 0
	if kdt > 0 then
		gaLeft = gaLeft + aecho
		gaRight = gaRight + aecho
	endif
endin

// chorus
instr 107
	krate table p4, 38 
	kdepth table p4, 39 
	adepth = kdepth
	adel oscili adepth, krate, 33
	adel = adepth + adel
	ain = gachorus[p4]
	ach flanger ain, adel, 0, 0.06
	gachorus[p4] = 0
	gaLeft = gaLeft + ach
	gaRight = gaRight + ach
endin

// master output
instr 110
	a1 clip gaLeft, 0, .99
	a2 clip gaRight, 0, .99
	
	outs a1, a2
	clear gaLeft, gaRight
endin

// turn everything off when reset() is called
instr 200
	garev1 = 0
	garev2 = 0
	gaLeft = 0
	gaRight = 0

	turnoff2 10, 0, 0
	turnoff2 12, 0, 0
	turnoff2 1, 0, 0
	turnoff2 100, 0, 0
	turnoff2 105, 0, 0
	turnoff2 107, 0, 0
	turnoff2 110, 0, 0

	turnoff3 10
	turnoff3 12
	turnoff3 1
	turnoff3 100
	turnoff3 105
	turnoff3 107
	turnoff3 110
	schedule(300, .1, 1)
	turnoff
endin

// turn everything back on
instr 300
	schedule(1, 0, -1)
	schedule(100, 0, -1)
	schedule(110, 0, -1)
endin


//ifn ftgen 8,0,1024,7,0,1024,0
/*instr 101
 tableiw 0.5,100,17
 tableiw 0.4,100,27
 tableiw 0.1,100,19
 tableiw 1,100,20
 tableiw 0.7,100,21
endin
*/
//schedule(101,0,0)
//schedule(10,1,5,60,10,0,100)
//schedule(10,1,5,60.5,100,0,0)

//schedule(2,0,0,"/Users/victor/audio/paisley.ogg",48,0)
//schedule(12,1,-1,48,100,0,500)
//schedule(2,0,0,"pianoc2.wav",48,0)
//schedule(12,1,-1,48,100,0,500)

</CsInstruments>
<CsScore>
/* program preset (memory) table */
f1 0 16 -2 0 0 0 0 0 0 0 0 226 0 0 0 0 0 0 0
/* velocity (memory) table */ 
f2 0 1024 -7 127 1024 127
/* pan (memory) table */
f3 0 1024 -7 64 1024 127
f5 0 128 5 0.1 128 1   /* velocity mapping: less nuanced */
f6 0 128 5 0.01 128 1 /* velocity mapping: more nuanced */
f7 0 128 7 0 128 0  /* note on table */
f8 0 1024 7 0 1024 0  /* reverb amount table */
f9 0 1024 7 0 1024 0  /* sample table */
f10 0 1024 -7 60 1024 60  /* sample base table */
f11 0 1024 -7 0 1024 0  /* sample loop start table */
f12 0 1024 -7 0 1024 0  /* sample loop end table */
f13 0 1024 -7 0.025 1024 0.025  /* sample loop fade table */
f14 0 1024 7 1 1024 1  /* sample pitch table */
f15 0 1024 7 1 1024 1  /* sample speed ref table */
f16 0 1024 7 1 1024 1  /* sample playback speed table */
f17 0 1024 7 1 1024 1  /* lp cutoff table */
f18 0 1024 7 0 1024 0  /* lp res table */
f19 0 1024 7 0 1024 0  /* lp att */
f20 0 1024 7 0 1024 0  /* lp dec */
f21 0 1024 7 1 1024 1  /* lp sus */
f22 0 1024 7 0 1024 0  /* lp rel */
f23 0 1024 7 0 1024 0  /* a att */
f24 0 1024 7 0 1024 0  /* d dec */
f25 0 1024 7 1 1024 1  /* s sus */
f26 0 1024 -7 0.1 1024 0.1  /* r rel */
f27 0 1024 7 0 1024 0  /* fil env amount */
f28 0 1024 7 0 1024 0 /* freq shift table */
f29 0 16384 10 1 /* sine for quadrature osc */
f30 0 1024 7 0 1024 0  /* delay time */
f31 0 1024 7 0 1024 0  /* delay feedback */
f32 0 1024 -7 0 1024 0  /* auto-pan rate (Hz) per channel */
f33 0 4096 10 1  /* sine wave for auto-pan LFO */
f34 0 1024 -7 0 1024 0  /* distortion drive (0 = off) */
f35 0 1024 -7 0 1024 0  /* highpass cutoff (0 = off) */
f36 0 1024 -7 5 1024 5  /* tremolo rate (Hz) */
f37 0 1024 -7 0 1024 0  /* tremolo depth (0 = off) */
f38 0 1024 -7 0.25 1024 0.25  /* chorus rate (Hz) */
f39 0 1024 -7 0 1024 0  /* chorus depth in seconds (JS clamps to 0-0.025) */
f40 0 257 9 .5 1 270  /* distortion waveshaping table (GEN09, per the distort/GEN09 manual example) */
f60 0 1024 -7 0 1024 0  /* chorus active flag (0/1) */

i 1 0 z
i 100 0 z
i 110 0 z
e
</CsScore>
</CsoundSynthesizer> 
<bsbPanel>
 <label>Widgets</label>
 <objectName/>
 <x>100</x>
 <y>100</y>
 <width>320</width>
 <height>240</height>
 <visible>true</visible>
 <uuid/>
 <bgcolor mode="nobackground">
  <r>255</r>
  <g>255</g>
  <b>255</b>
 </bgcolor>
</bsbPanel>
<bsbPresets>
</bsbPresets>

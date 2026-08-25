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

//flanger / chorus / phaser / comb-filter sends (per-channel bus effects)
gaflange[] init 100
gachorus[] init 100
gaphaser[] init 100
gacomb[] init 100

//freq shift
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

//--- Signal Modifiers (Csound opcode groups exposed as litePlay effects) ---
//note: the topmost-cf constant used below to map a normalised 0-1 cutoff onto
//Hz is `gicf`, the SAME constant the existing vclpf-based filter uses,
//defined once at the very top of the file (see the note there).

//Waveshaping and Phase Distortion: distortion via the `distort` opcode.
//table 34: drive (0-1, 0 = exact bypass, crossfaded here rather than relying
//on distort's own near-linear-at-0 behaviour, which the docs do not guarantee bit-exact)
opcode Distort, aa, aak
	ain1, ain2, kchn xin
	kdrive table kchn, 34
	ad1 distort ain1, kdrive, 56
	ad2 distort ain2, kdrive, 56
	aout1 = ain1*(1-kdrive) + ad1*kdrive
	aout2 = ain2*(1-kdrive) + ad2*kdrive
	xout aout1, aout2
endop

//Standard Filters: high-pass via `atone` (the complement of the existing vclpf low-pass).
//table 35: cutoff (0-1, 0 = transparent/off, 1 = brightest highpass)
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

//Specialized Filters: Moog-ladder resonant low-pass via `moogladder`, a second filter
//character alongside the existing vclpf-based cutoff()/resonance(). moogladder's
//ladder stages always run their signal through a soft (tanh) saturation, so
//there is no literal bypass; the cutoff ceiling below is kept a little under
//Nyquist (rather than exactly at it) so that saturation's own harmonics still
//have some headroom to roll off instead of aliasing right back into the band.
//table 36: cutoff (0-1, default 1 = wide open); table 37: resonance (0-4, default 0)
opcode MoogFilter, aa, aak
	ain1, ain2, kchn xin
	kcut table kchn, 36
	kres table kchn, 37
	kcut = kcut < 0.95 ? kcut : 0.95
	kres = kres < 4 ? (kres > 0 ? kres : 0) : 4
	kcf = exp(kcut*gicf)
	am1 moogladder ain1, kcf, kres
	am2 moogladder ain2, kcf, kres
	xout am1, am2
endop

//Amplitude Modifiers and Dynamic Processing: compressor via `dam`.
//table 38: amount (0-1, 0 = exact bypass via irtime=iftime=0); table 39: threshold (0-1)
opcode Compressor, aa, aak
	ain1, ain2, kchn xin
	kamt table kchn, 38
	kthresh table kchn, 39
	iamt = i(kamt)
	iratio = 1 - iamt*0.85
	iratio = iratio > 0.05 ? (iratio < 1 ? iratio : 1) : 0.05
	iratt = iamt > 0 ? 0.03 : 0
	irel = iamt > 0 ? 0.25 : 0
	ac1 dam ain1, kthresh, iratio, 1, iratt, irel
	ac2 dam ain2, kthresh, iratio, 1, iratt, irel
	xout ac1, ac2
endop

//Amplitude Modifiers and Dynamic Processing: tremolo (amplitude LFO).
//table 40: rate in Hz; table 41: depth (0-1, 0 = exact bypass)
opcode Tremolo, aa, aak
	ain1, ain2, kchn xin
	krate table kchn, 40
	kdepth table kchn, 41
	klfo oscili kdepth, krate, 33
	kenv = 1 - kdepth*0.5 + klfo
	xout ain1*kenv, ain2*kenv
endop

//Special Effects: ring modulator (amplitude multiplication by a sine carrier),
//distinct from the existing SSB frequency Shift above.
//table 42: carrier frequency in Hz; table 43: mix (0-1, 0 = exact bypass)
opcode RingMod, aa, aak
	ain1, ain2, kchn xin
	kfreq table kchn, 42
	kmix table kchn, 43
	kcar oscili 1, kfreq, 33
	ar1 = ain1*kcar
	ar2 = ain2*kcar
	aout1 = ain1*(1-kmix) + ar1*kmix
	aout2 = ain2*(1-kmix) + ar2*kmix
	xout aout1, aout2
endop

//Sample Level Operators: lo-fi sample & hold via `samphold` + `mpulse`.
//table 44: rate in Hz; table 45: mix (0-1, 0 = exact bypass)
opcode SampleHold, aa, aak
	ain1, ain2, kchn xin
	krate table kchn, 44
	kmix table kchn, 45
	agate mpulse 1, 1/(krate > 1 ? krate : 1)
	ah1 samphold ain1, agate
	ah2 samphold ain2, agate
	aout1 = ain1*(1-kmix) + ah1*kmix
	aout2 = ain2*(1-kmix) + ah2*kmix
	xout aout1, aout2
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
	a1, a2 MoogFilter a1, a2, p7
	a1, a2 Compressor a1, a2, p7
	a1, a2 Tremolo a1, a2, p7
	a1, a2 RingMod a1, a2, p7
	a1, a2 SampleHold a1, a2, p7
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
	//send to flanger / chorus / phaser / comb-filter (each gated on its own
	//active-flag table so a channel that never enables an effect never
	//accumulates into that effect's bus)
	kflon table p7, 59
	if kflon > 0 then
		gaflange[p7] = gaflange[p7] + a1
		gaflange[p7] = gaflange[p7] + a2
	endif
	kchon table p7, 60
	if kchon > 0 then
		gachorus[p7] = gachorus[p7] + a1
		gachorus[p7] = gachorus[p7] + a2
	endif
	kphon table p7, 61
	if kphon > 0 then
		gaphaser[p7] = gaphaser[p7] + a1
		gaphaser[p7] = gaphaser[p7] + a2
	endif
	kcbon table p7, 62
	if kcbon > 0 then
		gacomb[p7] = gacomb[p7] + a1
		gacomb[p7] = gacomb[p7] + a2
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
	a1, a2 MoogFilter a1, a2, p7
	a1, a2 Compressor a1, a2, p7
	a1, a2 Tremolo a1, a2, p7
	a1, a2 RingMod a1, a2, p7
	a1, a2 SampleHold a1, a2, p7

	a1 *= (0.5-kpan/2)
	a2 *= (0.5+kpan/2)
	//send to delay (gated on kdt so an inactive channel's bus never accumulates)
	kdt table p7,30
	if kdt > 0 then
		gadel[p7] = gadel[p7] + a1
		gadel[p7] = gadel[p7] + a2
	endif
	//send to flanger / chorus / phaser / comb-filter (each gated on its own
	//active-flag table so a channel that never enables an effect never
	//accumulates into that effect's bus)
	kflon table p7, 59
	if kflon > 0 then
		gaflange[p7] = gaflange[p7] + a1
		gaflange[p7] = gaflange[p7] + a2
	endif
	kchon table p7, 60
	if kchon > 0 then
		gachorus[p7] = gachorus[p7] + a1
		gachorus[p7] = gachorus[p7] + a2
	endif
	kphon table p7, 61
	if kphon > 0 then
		gaphaser[p7] = gaphaser[p7] + a1
		gaphaser[p7] = gaphaser[p7] + a2
	endif
	kcbon table p7, 62
	if kcbon > 0 then
		gacomb[p7] = gacomb[p7] + a1
		gacomb[p7] = gacomb[p7] + a2
	endif
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

// reverb
instr 100
	ksize table 0, 57
	kdamp table 0, 58
	a1, a2 freeverb garev1, garev2, ksize, kdamp, sr

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

// flanger (Special Effects: modulated short delay + feedback, via `flanger`)
// table 47 already stores the depth in seconds (JS clamps it to 0-0.015s), so
// it is used directly here; imaxd (0.04) leaves headroom above the max
// possible instantaneous delay (2*0.015 = 0.03s).
instr 106
	krate table p4, 46
	kdepth table p4, 47
	kfb table p4, 48
	adepth = kdepth
	adel oscili adepth, krate, 33
	adel = adepth + adel
	ain = gaflange[p4]
	afl flanger ain, adel, kfb, 0.04
	gaflange[p4] = 0
	gaLeft = gaLeft + afl
	gaRight = gaRight + afl
endin

// chorus (Special Effects: modulated delay w/ no feedback, longer range than
// flanger). table 50 stores depth in seconds (JS clamps to 0-0.025s); imaxd
// (0.06) leaves headroom above the max possible delay (2*0.025 = 0.05s).
instr 107
	krate table p4, 49
	kdepth table p4, 50
	adepth = kdepth
	adel oscili adepth, krate, 33
	adel = adepth + adel
	ain = gachorus[p4]
	ach flanger ain, adel, 0, 0.06
	gachorus[p4] = 0
	gaLeft = gaLeft + ach
	gaRight = gaRight + ach
endin

// phaser (Special Effects: allpass chain sweep, via `phaser1`). iord is
// clamped defensively even though the JS side already keeps it in 1-4999,
// since phaser1 allocates its internal buffer from this value at init and an
// out-of-range value here would be a much worse failure than a clamp.
instr 108
	kfreq table p4, 51
	iord table p4, 52
	kfb table p4, 53
	iord = iord >= 1 ? (iord <= 4999 ? iord : 4999) : 1
	ain = gaphaser[p4]
	aph phaser1 ain, kfreq, iord, kfb
	gaphaser[p4] = 0
	aout = (ain + aph)*0.5
	gaLeft = gaLeft + aout
	gaRight = gaRight + aout
endin

// comb filter (Specialized Filters: resonant feedback comb, via `comb`).
// krvt/ilpt are floored defensively (again, on top of the JS-side guard):
// comb's own coefficient math only protects krvt from the low side, and
// ilpt<=0 fails the opcode's init outright ("illegal loop time"), which would
// silence this bus for the rest of the session.
instr 109
	krvt table p4, 54
	ilpt table p4, 55
	krvt = krvt > 0.001 ? krvt : 0.001
	ilpt = ilpt > 0.001 ? ilpt : 0.001
	ain = gacomb[p4]
	acb comb ain, krvt, ilpt
	gacomb[p4] = 0
	gaLeft = gaLeft + acb
	gaRight = gaRight + acb
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
	turnoff2 106, 0, 0
	turnoff2 107, 0, 0
	turnoff2 108, 0, 0
	turnoff2 109, 0, 0
	turnoff2 110, 0, 0

	turnoff3 10
	turnoff3 12
	turnoff3 1
	turnoff3 100
	turnoff3 105
	turnoff3 106
	turnoff3 107
	turnoff3 108
	turnoff3 109
	turnoff3 110
	schedule(300, .1, 1)
	turnoff
endin

// turn everything back on
instr 300
	schedule(1, 0, -1)
	schedule(100, 0, -1)
	schedule(105, 0, -1)
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

/* --- Signal Modifiers tables --- */
f34 0 1024 -7 0 1024 0  /* distortion drive (0 = off) */
f35 0 1024 -7 0 1024 0  /* highpass cutoff (0 = off) */
f36 0 1024 -7 1 1024 1  /* moog filter cutoff (1 = wide open) */
f37 0 1024 -7 0 1024 0  /* moog filter resonance */
f38 0 1024 -7 0 1024 0  /* compressor amount (0 = off) */
f39 0 1024 -7 0.3 1024 0.3  /* compressor threshold */
f40 0 1024 -7 5 1024 5  /* tremolo rate (Hz) */
f41 0 1024 -7 0 1024 0  /* tremolo depth (0 = off) */
f42 0 1024 -7 200 1024 200  /* ring modulator frequency (Hz) */
f43 0 1024 -7 0 1024 0  /* ring modulator mix (0 = off) */
f44 0 1024 -7 20 1024 20  /* sample & hold rate (Hz) */
f45 0 1024 -7 0 1024 0  /* sample & hold mix (0 = off) */
f46 0 1024 -7 0.5 1024 0.5  /* flanger rate (Hz) */
f47 0 1024 -7 0 1024 0  /* flanger depth in seconds (JS clamps to 0-0.015) */
f48 0 1024 -7 0 1024 0  /* flanger feedback */
f49 0 1024 -7 0.25 1024 0.25  /* chorus rate (Hz) */
f50 0 1024 -7 0 1024 0  /* chorus depth in seconds (JS clamps to 0-0.025) */
f51 0 1024 -7 400 1024 400  /* phaser rate (Hz) */
f52 0 1024 -7 4 1024 4  /* phaser stages */
f53 0 1024 -7 0 1024 0  /* phaser feedback */
f54 0 1024 -7 0 1024 0  /* comb filter decay time (s) */
f55 0 1024 -7 0.01 1024 0.01  /* comb filter loop time (s) */
f56 0 257 9 .5 1 270  /* distortion waveshaping table (GEN09, per the distort/GEN09 manual example) */
f57 0 2 -2 0.7  /* reverb size (global, matches the previous hardcoded default) */
f58 0 2 -2 0.35  /* reverb damping (global, matches the previous hardcoded default) */
f59 0 1024 -7 0 1024 0  /* flanger active flag (0/1) */
f60 0 1024 -7 0 1024 0  /* chorus active flag (0/1) */
f61 0 1024 -7 0 1024 0  /* phaser active flag (0/1) */
f62 0 1024 -7 0 1024 0  /* comb filter active flag (0/1) */

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

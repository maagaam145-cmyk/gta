(function () {
  const SV = (window.SV = window.SV || {});

  let ctx = null;
  let masterGain = null;
  let engineOsc = null;
  let engineGain = null;
  let radioTimer = null;
  let radioOn = true;
  let stepIndex = 0;

  const CITY_NOTES = {
    seoul: [220, 261.63, 329.63, 392.0, 440, 392.0, 329.63, 293.66],
    busan: [196, 246.94, 293.66, 392.0, 329.63, 293.66, 246.94, 220],
    incheon: [233.08, 293.66, 349.23, 466.16, 392.0, 349.23, 293.66, 261.63],
    jeju: [261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66],
  };

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.28;
    masterGain.connect(ctx.destination);

    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(masterGain);
    engineOsc.start();

    startRadioLoop();
    return ctx;
  }

  function startRadioLoop() {
    if (radioTimer) clearInterval(radioTimer);
    radioTimer = setInterval(() => {
      if (!ctx || !radioOn || ctx.state !== 'running') return;
      const cityId = (SV.state && SV.state.cityId) || 'seoul';
      const scale = CITY_NOTES[cityId] || CITY_NOTES.seoul;
      const freq = scale[stepIndex % scale.length];
      stepIndex++;

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = stepIndex % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * (stepIndex % 4 === 0 ? 0.5 : 1), ctx.currentTime);
      g.gain.setValueAtTime(0.055, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.34);
    }, 340);
  }

  function updateEngine(speed, inVehicle) {
    if (!ctx || !engineGain || !engineOsc) return;
    if (!inVehicle) {
      engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      return;
    }
    const ratio = Math.min(1, Math.abs(speed) / 38);
    engineOsc.frequency.setTargetAtTime(52 + ratio * 115, ctx.currentTime, 0.06);
    engineGain.gain.setTargetAtTime(0.04 + ratio * 0.07, ctx.currentTime, 0.08);
  }

  function playTone(freq, duration, type, volume, slideTo) {
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    g.gain.setValueAtTime(volume || 0.14, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function playShot(isSmg) {
    if (!ctx || ctx.state !== 'running') return;
    playTone(isSmg ? 380 : 280, 0.11, 'square', 0.16, 65);
  }

  function playPunch() {
    playTone(130, 0.12, 'triangle', 0.18, 45);
  }

  function playCrosswalkBeep() {
    playTone(1180, 0.07, 'sine', 0.035);
  }

  function playTravelChime() {
    playTone(523.25, 0.22, 'sine', 0.18);
    setTimeout(() => playTone(659.25, 0.22, 'sine', 0.18), 160);
    setTimeout(() => playTone(783.99, 0.35, 'sine', 0.2), 320);
  }

  function playCashChime() {
    playTone(659.25, 0.14, 'triangle', 0.16);
    setTimeout(() => playTone(987.77, 0.25, 'triangle', 0.18), 110);
  }

  function toggleRadio() {
    radioOn = !radioOn;
    return radioOn;
  }

  SV.Audio = {
    ensureContext,
    updateEngine,
    playShot,
    playPunch,
    playCrosswalkBeep,
    playTravelChime,
    playCashChime,
    toggleRadio,
    isRadioOn: () => radioOn,
  };
})();

/* Synthesised sound effects (Web Audio) — no audio files needed. */
(function () {
  class Sfx {
    constructor() { this.ctx = null; this.muted = false; this.lastStep = 0; }
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      // white noise buffer
      const n = c.sampleRate * 2;
      this.noise = c.createBuffer(1, n, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // reverb impulse
      const rl = c.sampleRate * 2.2;
      const imp = c.createBuffer(2, rl, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const x = imp.getChannelData(ch); for (let i = 0; i < rl; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2); }
      this.verb = c.createConvolver(); this.verb.buffer = imp;
      this.verbGain = c.createGain(); this.verbGain.gain.value = 0.35;
      this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
      this._loadVoices();
    }
    /* real recorded cries (assets/sounds, see CREDITS.txt); synthesised fallback until they load */
    _loadVoices() {
      this.cries = { m: { die: [], hit: [] }, f: { die: [], hit: [] } };
      for (const g of ['m', 'f']) for (const k of ['die', 'hit']) for (let i = 1; i <= 3; i++) {
        fetch('assets/sounds/' + g + '-' + k + '-' + i + '.mp3').then(r => r.arrayBuffer())
          .then(b => new Promise((res, rej) => this.ctx.decodeAudioData(b, res, rej)))
          .then(buf => this.cries[g][k].push(buf)).catch(() => {});
      }
    }
    _cry(gender, kind, gain, delay) {
      const list = this.cries && this.cries[gender === 'f' ? 'f' : 'm'][kind];
      if (!list || !list.length) return false;
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const src = c.createBufferSource(); src.buffer = list[Math.floor(Math.random() * list.length)];
      src.playbackRate.value = 0.9 + Math.random() * 0.22;          // every person sounds a bit different
      const g = c.createGain(); g.gain.value = gain;
      src.connect(g);
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      if (pan) { pan.pan.value = Math.random() * 1.4 - 0.7; g.connect(pan); pan.connect(this.master); } else g.connect(this.master);
      g.connect(this.verb);
      src.start(t);
      return true;
    }
    /* cry when hit by the shot */
    hitCry(gender, vol) { if (this.ok) this._cry(gender, 'hit', 0.42 * (vol == null ? 1 : vol)); }
    get ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; }
    setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; }

    _noise(t, dur, filterType, freq, q, gainPeak, attack, decay, dest, rate) {
      const c = this.ctx;
      const src = c.createBufferSource(); src.buffer = this.noise;
      src.playbackRate.value = rate || 1;
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gainPeak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      src.connect(f); f.connect(g); g.connect(dest || this.master);
      src.start(t, Math.random() * 1.5); src.stop(t + dur);
      return { src, f, g };
    }
    _tone(t, type, f0, f1, dur, gainPeak, dest) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.master);
      o.start(t); o.stop(t + dur + 0.05);
      return { o, g };
    }

    step(vol) {
      if (!this.ok) return;
      const c = this.ctx, t = c.currentTime;
      if (t - this.lastStep < 0.035) return;
      this.lastStep = t;
      const v = Math.max(0.05, Math.min(1, vol == null ? 0.6 : vol));
      this._noise(t, 0.12, 'bandpass', 150 + Math.random() * 120, 1.2, 0.55 * v, 0.003, 0.07);
      this._noise(t, 0.08, 'bandpass', 1400 + Math.random() * 900, 2, 0.12 * v, 0.002, 0.04);
    }
    gunshot() {
      if (!this.ok) return;
      const c = this.ctx, t = c.currentTime;
      this._noise(t, 0.3, 'highpass', 900, 0.7, 1.0, 0.001, 0.12);
      const body = this._noise(t, 0.6, 'lowpass', 1800, 0.8, 0.9, 0.002, 0.38);
      body.g.connect(this.verb);
      const boom = this._tone(t, 'sine', 140, 38, 0.45, 0.9);
      boom.g.connect(this.verb);
    }
    tick(high) {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(t, 'sine', high ? 1150 : 820, null, 0.07, 0.22);
      this._noise(t, 0.04, 'bandpass', 2500, 3, 0.07, 0.001, 0.02);
    }
    turnCue(ms) {
      if (!this.ok) return;
      const c = this.ctx, t = c.currentTime, d = Math.max(0.3, ms / 1000);
      const n = this._noise(t, d + 0.3, 'bandpass', 300, 2.5, 0.35, d * 0.8, 0.25);
      n.f.frequency.setValueAtTime(300, t);
      n.f.frequency.exponentialRampToValueAtTime(2600, t + d);
      this._tone(t, 'triangle', 98, 92, d + 0.4, 0.22);
      this._tone(t + d * 0.9, 'square', 740, null, 0.12, 0.05);
    }
    beep(freq, len) {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(t, 'square', freq, null, len || 0.18, 0.12);
    }
    horn() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [392, 494, 587].forEach(f => this._tone(t, 'sawtooth', f, null, 0.7, 0.06));
    }
    ding() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(t, 'sine', 1320, null, 1.1, 0.25);
      this._tone(t, 'sine', 1980, null, 0.8, 0.12);
      this._tone(t + 0.12, 'sine', 1760, null, 1.0, 0.18);
    }
    cheer(big) {
      if (!this.ok) return;
      const c = this.ctx, t = c.currentTime;
      const dur = big ? 5.5 : 3.6, peak = big ? 0.5 : 0.36;
      [450, 950, 1900, 3200].forEach((f, i) => {
        const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const flt = c.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = 0.9;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak * (i === 3 ? 0.4 : 1), t + 0.35);
        g.gain.setValueAtTime(peak * (i === 3 ? 0.4 : 1) * 0.85, t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lfo = c.createOscillator(); lfo.frequency.value = 2 + Math.random() * 3;
        const lg = c.createGain(); lg.gain.value = peak * 0.25; lfo.connect(lg); lg.connect(g.gain);
        src.connect(flt); flt.connect(g); g.connect(this.master); g.connect(this.verb);
        src.start(t, Math.random()); src.stop(t + dur); lfo.start(t); lfo.stop(t + dur);
      });
      const voices = big ? 16 : 10;
      for (let i = 0; i < voices; i++) {
        const st = t + Math.random() * 0.7, len = 0.6 + Math.random() * 0.9;
        const o = c.createOscillator(); o.type = 'sawtooth';
        const base = 260 + Math.random() * 280;
        o.frequency.setValueAtTime(base, st);
        o.frequency.exponentialRampToValueAtTime(base * (1.6 + Math.random() * 0.6), st + len * 0.4);
        o.frequency.exponentialRampToValueAtTime(base * 1.1, st + len);
        const vib = c.createOscillator(); vib.frequency.value = 5 + Math.random() * 2;
        const vg = c.createGain(); vg.gain.value = 12; vib.connect(vg); vg.connect(o.frequency);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.03, st + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, st + len);
        o.connect(lp); lp.connect(g); g.connect(this.master);
        o.start(st); o.stop(st + len + 0.05); vib.start(st); vib.stop(st + len + 0.05);
      }
      const claps = big ? 110 : 60;
      for (let i = 0; i < claps; i++) {
        const st = t + 0.1 + Math.random() * (dur * 0.7);
        this._noise(st, 0.06, 'bandpass', 1100 + Math.random() * 900, 1.2, 0.16, 0.001, 0.03);
      }
    }
    /* a short panicked shout, synthesised: buzzy voice source -> vowel formants; deeper for boys, higher for girls */
    shout(gender, vol) {
      if (!this.ok) return;
      if (this._cry(gender, 'die', 0.48 * (vol == null ? 1 : vol))) return;
      const c = this.ctx, t = c.currentTime + Math.random() * 0.05;
      const female = gender === 'f';
      const f0 = female ? 360 + Math.random() * 140 : 150 + Math.random() * 80;
      const dur = 0.45 + Math.random() * 0.4;
      const peak = (vol == null ? 1 : vol) * 0.9;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 0.9, t);
      o.frequency.linearRampToValueAtTime(f0 * (1.25 + Math.random() * 0.2), t + dur * 0.3);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + dur);
      const vib = c.createOscillator(); vib.frequency.value = 6 + Math.random() * 3;
      const vg = c.createGain(); vg.gain.value = f0 * 0.03; vib.connect(vg); vg.connect(o.frequency);
      const out = c.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peak, t + 0.05);
      out.gain.setValueAtTime(peak * 0.8, t + dur * 0.6);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      // vowel "ah"/"aa" formants
      const formants = female ? [[850, 1.6, 1], [1250, 6, 0.6], [2900, 8, 0.25]] : [[700, 1.6, 1], [1150, 6, 0.55], [2600, 8, 0.2]];
      for (const [f, q, g] of formants) {
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (0.95 + Math.random() * 0.1); bp.Q.value = q;
        const fg = c.createGain(); fg.gain.value = g;
        o.connect(bp); bp.connect(fg); fg.connect(out);
      }
      // a bit of breath
      const n = c.createBufferSource(); n.buffer = this.noise;
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = female ? 3000 : 2200; nf.Q.value = 0.8;
      const ng = c.createGain(); ng.gain.value = 0.25;
      n.connect(nf); nf.connect(ng); ng.connect(out);
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      if (pan) { pan.pan.value = Math.random() * 1.4 - 0.7; out.connect(pan); pan.connect(this.master); } else out.connect(this.master);
      out.connect(this.verb);
      o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    }
    fanfare() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.13, 'triangle', f, null, i === 3 ? 1.2 : 0.3, 0.2));
      [523, 659, 784].forEach(f => this._tone(t + 0.52, 'sawtooth', f, null, 1.2, 0.04));
    }
  }
  window.STEPSfx = Sfx;
})();

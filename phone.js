/* Phone controller — talks to the big screen through Supabase Realtime (see net.js). */
(function () {
  const $ = id => document.getElementById(id);
  const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const pad = n => String(n).padStart(3, '0');
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  const STATUS = { r: 'ready', w: 'waiting', a: 'alive', o: 'out', x: 'won' };

  let net = null, code = '', pid = '', joined = false, down = false;
  let phase = null, status = null, myNum = null, drawnNum = null, lastPodKey = '', gotState = false;
  let gender = store.get('step-rlgl-gender');
  let shotDone = true;
  // your own runner gets shot on the phone's field: shake + boom + vibration, then the ELIMINATED card
  PhoneArena.onMyShot(() => { vib([300, 80, 300, 80, 600]); setTimeout(() => { shotDone = true; if (lastSt) update(lastSt); }, 1100); });

  function show(id) { document.querySelectorAll('#phoneApp .screen').forEach(s => s.classList.toggle('show', s.id === id)); }
  function full(id) { ['outScr', 'wonScr', 'endScr'].forEach(f => $(f).classList.toggle('show', f === id)); }

  window.startPhone = function () {
    $('phoneApp').hidden = false;
    $('name').value = store.get('step-rlgl-name') || '';
    STEPGroups.fill($('teamSel')); const savedTeam = store.get('step-rlgl-team'); if (savedTeam) $('teamSel').value = savedTeam;
    code = window.PHONE_ROOM || '';
    $('roomIn').hidden = !!code;
    $('joinBtn').onclick = join;
    $('name').addEventListener('keydown', e => { if (e.key === 'Enter') join(); });
    for (const [id, g] of [['gBoy', 'm'], ['gGirl', 'f']]) {
      const b = $(id), c = b.querySelector('canvas'), x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height); x.drawImage(PX.charSprite(PX.look('preview-' + g + '1', g), 'front', 'idle'), 1, 0);
      b.onclick = () => { gender = g; store.set('step-rlgl-gender', g); markGender(); };
    }
    markGender();
    if (code) connect();
  };

  function connect() {
    if (net) return;
    pid = store.get('step-rlgl-pid-' + code);
    if (!pid) { pid = STEPNet.newId(); store.set('step-rlgl-pid-' + code, pid); }
    let offTimer = null;
    net = new STEPNet.PhoneNet(code, pid, {
      onState(st) { gotState = true; lastSt = st; update(st); },
      onStatus(ok) {
        clearTimeout(offTimer);
        if (ok) $('conn').hidden = true;
        else offTimer = setTimeout(() => { $('conn').hidden = false; setPress(false); }, 2500);
      }
    });
    net.start();
  }

  function markGender() {
    $('gBoy').classList.toggle('on', gender === 'm'); $('gGirl').classList.toggle('on', gender === 'f');
    $('gBoy').setAttribute('aria-pressed', gender === 'm'); $('gGirl').setAttribute('aria-pressed', gender === 'f');
  }
  function join() {
    if (!code) {
      code = $('roomIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (code.length < 4) { $('err').textContent = 'Type the 4-letter room code shown on the big screen.'; code = ''; return; }
    }
    const n = $('name').value.replace(new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']', 'g'), '').trim().slice(0, 24);
    if (!n) { $('err').textContent = 'Please type your name first.'; return; }
    if (!gender) { $('err').textContent = 'Pick Boy or Girl for your player.'; return; }
    const team = $('teamSel').value;
    if (!team) { $('err').textContent = 'Pick your team or group.'; return; }
    store.set('step-rlgl-team', team);
    store.set('step-rlgl-name', n);
    initAudio();
    connect();
    net.join(n, gender, team);
    $('myTeam').textContent = team;
    joined = true; $('myName').textContent = n; show('game'); PhoneArena.start($('arena'));
    setLight('', 'JOINING…'); $('note').textContent = 'Connecting to the big screen…';
    setTimeout(() => { if (!gotState) { setLight('', 'NO GAME FOUND YET'); $('note').textContent = 'Check the room code on the big screen, and that the host has the game open.'; } }, 8000);
  }

  const PIR = () => window.GAME_THEME === 'pirate';
  function update(st) {
    if (!joined) return;
    // follow the game the big screen is running (Red Light, Green Light or All Aboard!)
    if (window.setGameTheme) { const gm = st.gm === 'p' ? 'pirate' : 'squid'; if (gm !== window.GAME_THEME) { setGameTheme(gm); phase = null; } }
    dollVoice(st);
    const entry = st.pl && st.pl[pid];
    const newPhase = st.ph;
    if (!entry) {
      const fullGame = st.pl && Object.keys(st.pl).length >= (st.mx || 25);
      setLight('', fullGame ? 'GAME IS FULL' : 'JOINING…');
      $('note').textContent = fullGame ? 'The game already has the maximum number of players.' : 'Hang on, the big screen is adding you.';
      return;
    }
    const [num, s, prog, rank] = entry;
    const newStatus = STATUS[s] || 'ready';
    if (num !== myNum) { myNum = num; $('myNum').textContent = 'PLAYER ' + pad(num); }
    if (drawnNum !== num) {
      drawnNum = num;
      const g = $('me').getContext('2d'); g.clearRect(0, 0, 14, 22);
      g.drawImage(PX.charSprite(PX.look('p' + num, gender), 'front', 'idle'), 1, 0);
    }
    PhoneArena.update(st, pid);
    const b = $('badge');
    b.textContent = { ready: 'READY', waiting: 'NEXT ROUND', alive: 'ALIVE', out: 'OUT', won: PIR() ? 'ABOARD' : 'SAFE' }[newStatus];
    b.className = 'badge ' + newStatus;

    if (newStatus !== status) {
      if (newStatus === 'out' && status === 'alive') { shotDone = false; setTimeout(() => { if (!shotDone) { shotDone = true; if (lastSt) update(lastSt); } }, 4500); }
      if (newStatus !== 'out') shotDone = true;
      if (newStatus === 'won' && status === 'alive') { vib([80, 60, 80, 60, 200]); }
      status = newStatus;
    }
    if (newPhase !== phase) { onPhase(newPhase, phase); phase = newPhase; }
    if (st.pod) {
      const key = JSON.stringify(st.pod);
      if (key !== lastPodKey) { lastPodKey = key; renderPod(st.pod); }
    }
    if (status === 'out' && phase !== 'lobby') full(phase === 'ended' ? 'endScr' : shotDone ? 'outScr' : null);
    else if (status === 'won' && phase !== 'lobby') { full('wonScr'); $('rankNum').textContent = ord(rank); }
    else if (phase === 'ended') full('endScr');
    else full(null);
    if (status !== 'alive') setPress(false);
    $('fwd').classList.toggle('locked', !(status === 'alive' && ['green', 'turning', 'red', 'turnback'].includes(phase)));
    if (status === 'waiting' && phase !== 'lobby') { setLight('', 'NEXT ROUND'); $('note').textContent = 'A round is in progress. You will join the next one.'; }
    // during play the field stays clear: watch the doll
    const playing = status === 'alive' && ['green', 'turning', 'red', 'turnback'].includes(phase);
    $('light').hidden = playing || status === 'out' || status === 'won' || phase === 'countdown';
    $('note').hidden = $('light').hidden;
  }

  let lastSt = null;

  function renderPod(pod) {
    const box = $('pod'); box.textContent = '';
    if (!pod.length) { box.textContent = PIR() ? 'Nobody made it aboard.' : 'Nobody crossed the safe line.'; return; }
    for (const [num, name, rank, team] of pod) { const d = document.createElement('div'); d.textContent = `${ord(rank)} · #${pad(num)} ${name}${team ? ' · ' + team : ''}`; box.appendChild(d); }
  }
  function setLight(cls, text) { const L = $('light'); L.className = 'light' + (cls ? ' ' + cls : ''); L.textContent = text; }

  function onPhase(p) {
    // No red/green hints on the phone: players must watch the doll on the big screen.
    if (PIR()) {
      if (p === 'lobby') { setLight('', 'WAITING FOR THE HOST'); $('note').textContent = 'You’re in! Run while the captain looks away. Freeze before he turns.'; }
      else if (p === 'countdown') { setLight('', 'GET READY…'); $('note').textContent = 'Watch the captain. Run while he sings, freeze before he turns.'; }
      else if (p === 'ended') { setLight('', 'GAME OVER'); setPress(false); }
      else { setLight('', 'WATCH THE CAPTAIN'); $('note').textContent = ''; }
      return;
    }
    if (p === 'lobby') { setLight('', 'WAITING FOR THE HOST'); $('note').textContent = 'You’re in! Run while the doll faces away. Freeze before she turns.'; }
    else if (p === 'countdown') { setLight('', 'GET READY…'); $('note').textContent = 'Watch the doll. Run while she sings, freeze before she turns.'; }
    else if (p === 'ended') { setLight('', 'GAME OVER'); setPress(false); }
    else { setLight('', 'WATCH THE DOLL'); $('note').textContent = ''; }
  }

  /* ---------- the FORWARD button ---------- */
  const active = new Set();
  function setPress(v) {
    if (v === down) return;
    down = v; $('fwd').classList.toggle('down', v);
    if (net && joined) net.press(v);
  }
  document.addEventListener('DOMContentLoaded', () => {});
  const F = () => $('fwd');
  window.addEventListener('load', () => {
    const f = F(); if (!f) return;
    f.addEventListener('pointerdown', e => { e.preventDefault(); try { f.setPointerCapture(e.pointerId); } catch {} active.add(e.pointerId); initAudio(); if (status === 'alive') setPress(true); });
    const up = e => { active.delete(e.pointerId); if (!active.size) setPress(false); };
    f.addEventListener('pointerup', up); f.addEventListener('pointercancel', up); f.addEventListener('lostpointercapture', up);
    f.addEventListener('contextmenu', e => e.preventDefault());
    f.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { active.clear(); setPress(false); } });
  window.addEventListener('blur', () => { active.clear(); setPress(false); });

  /* ---------- small phone sounds ---------- */
  let ac = null;
  /* ---------- the doll's voice on the phone (same recording as the big screen) ---------- */
  const DV = {
    full: { src: 'assets/voice/doll-full.mp3', text: 'Welcome to STEP Onboarding, welcome teams!', marks: [0.04, 0.74, 0.98, 1.18, 2.28, 2.80], len: 3.5 },
    short: { src: 'assets/voice/doll-short.mp3', text: 'Welcome!', marks: [0], len: 0.68 }
  };
  // the captain's voice (pirate edition): same recording, pitched down
  const DVP = {
    full: { src: 'assets/voice/pirate-full.mp3?v=2', text: 'Welcome to STEP Onboarding, welcome aboard!', marks: [0.04, 0.94, 1.24, 1.54, 2.69, 3.14], len: 3.89 },
    short: { src: 'assets/voice/pirate-short.mp3?v=2', text: 'Welcome aboard!', marks: [0.05, 0.50], len: 1.25 }
  };
  for (const set of [DV, DVP]) for (const k in set) { const a = new Audio(set[k].src); a.preload = 'auto'; a.preservesPitch = true; a.webkitPreservesPitch = true; set[k].el = a; }
  let voicePrimed = false, greenKey = null, dvTimers = [], dvPlaying = null;
  // phones only allow sound after a tap: unlock the recordings on the first tap
  function primeVoice() {
    if (voicePrimed) return; voicePrimed = true;
    for (const set of [DV, DVP]) for (const k in set) { const a = set[k].el; a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; }); }
  }
  function stopVoice() { dvTimers.forEach(clearTimeout); dvTimers = []; if (dvPlaying) { try { dvPlaying.pause(); } catch {} dvPlaying = null; } PhoneArena.setBubble(''); }
  function dollVoice(st) {
    if (st.ph !== 'green') { if (greenKey !== null) { greenKey = null; stopVoice(); } return; }
    if (st.gk == null || st.gk === greenKey) return;
    greenKey = st.gk; stopVoice();
    const v = (st.gm === 'p' ? DVP : DV)[st.ln === 'short' ? 'short' : 'full'];
    const avail = Math.max(0.4, ((st.gl || 2000) - 300) / 1000);       // a little less: the phone hears about it a moment late
    const rate = Math.max(1, Math.min(2.2, v.len / avail));
    const delay = Math.max(0, Math.min(1.5, avail - v.len / rate - 0.05));
    const words = v.text.split(' ');
    dvTimers.push(setTimeout(() => {
      const a = v.el; dvPlaying = a;
      try { a.pause(); a.currentTime = 0; } catch {}
      a.muted = false; a.playbackRate = rate;
      a.play().catch(() => {});
      v.marks.forEach((m, i) => dvTimers.push(setTimeout(() => PhoneArena.setBubble(words.slice(0, i === v.marks.length - 1 ? words.length : i + 1).join(' ')), m / rate * 1000)));
    }, delay * 1000));
  }
  function initAudio() {
    primeVoice();
    try { PhoneArena.sfx.unlock(); } catch {}
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {} }
  function tone(f, d, g0) { if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(g0 || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); }
  function thump() { if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.1); }
  function boom() { if (!ac) return; const t = ac.currentTime, n = ac.sampleRate * 0.5, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = 0.6; s.connect(g); g.connect(ac.destination); s.start(t); }
  function chime() { tone(1320, 0.8); setTimeout(() => tone(1760, 0.9), 120); }
  let stepTimer = null;
  function stepLoop() { clearTimeout(stepTimer); if (!down) return; if (['green', 'turning', 'red', 'turnback'].includes(phase)) thump(); stepTimer = setTimeout(stepLoop, 210); }
})();

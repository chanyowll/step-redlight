/* Phone arena: the same pixel-art field as the big screen, laid out tall for a phone.
   Fed by the game state the big screen broadcasts (see net.js / boot.js). No team banners. */
'use strict';
(function () {
  const C = PX.C;
  const LW = 200;                       // low-res width; height follows the phone's shape
  let LH = 356;
  const WALL = 66, FIN_Y = 100, FX0 = 4, FX1 = LW - 4;
  let START_Y = LH - 16;
  const DOLL = { x: 100, y: 90 };
  const GUARDS = [{ x: 62, y: 90, shape: 'circle', mirror: false, kind: 'a' }, { x: 138, y: 90, shape: 'triangle', mirror: true, kind: 'b' }];
  GUARDS.forEach(g => { g.muzzle = g.mirror ? { x: g.x - 17, y: g.y - 10 } : { x: g.x + 17, y: g.y - 10 }; g.hand = { x: g.x + (g.mirror ? 1 : -1), y: g.y - 40 }; });
  // pirate edition (ALL ABOARD!)
  const PIR = () => window.GAME_THEME === 'pirate';
  const SHIP = { cx: 100, hw: 90, deck: 47, keel: 70, top: 8, s: 0.55, dock: 76, planks: [26, 174] };
  let SHIPFG = null;
  const laneX = lane => Math.round(FX0 + 8 + lane * (FX1 - FX0 - 16));
  const progY = p => Math.round(START_Y - Math.max(0, Math.min(1.1, p)) * (START_Y - FIN_Y));
  const FONT = "'Jersey 15', system-ui, sans-serif";  // retro pixel font (drawn 1.23x so it reads like the old size)

  let cv = null, ctx = null, L = null, lg = null, BG = null, LABELS = [];
  const TAGS = [];
  let view = { s: 2, ox: 0, oy: 0 };
  const IMG = {};
  const mark = new Image(); mark.onload = () => { IMG.mark = mark; if (cv) BG = buildBG(); }; mark.src = 'assets/step-logo-mark.png';

  function resize() {
    if (!cv) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, cv.clientWidth), h = Math.max(1, cv.clientHeight);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const nLH = Math.max(240, Math.min(520, Math.round(LW * h / w)));
    if (nLH !== LH || !L) {
      LH = nLH; START_Y = LH - 16;
      L = PX.cnv(LW, LH); lg = L.getContext('2d'); lg.imageSmoothingEnabled = false;
      BG = buildBG();
    }
    const s = Math.min(cv.width / LW, cv.height / LH);
    view = { s, ox: Math.round((cv.width - LW * s) / 2), oy: Math.round((cv.height - LH * s) / 2) };
  }

  function buildPirateBG() {
    const c = PX.cnv(LW, LH), g = c.getContext('2d'), R = (x, y, w, h, col) => PX.R(g, x, y, w, h, col);
    const rnd = PX.rng(20261019);
    const K = PXP.K, labels = [], HZ = 30;
    const bands = [[0, C.sky1], [9, C.sky2], [18, C.sky3], [25, C.sky4]];
    bands.forEach(([y0, col], i) => {
      const y1 = i + 1 < bands.length ? bands[i + 1][0] : HZ;
      R(0, y0, LW, y1 - y0, col);
      if (i + 1 < bands.length) for (let x = 0; x < LW; x++) { if (x % 2 === 0) R(x, y1 - 1, 1, 1, bands[i + 1][1]); if (x % 2 === 1) R(x, y1, 1, 1, col); }
    });
    [[16, 8], [24, 12], [184, 22]].forEach(([x, y]) => PXP.gull(g, x, y));
    PXP.sea(g, LW, HZ, SHIP.dock, rnd);
    PXP.ship(g, Object.assign({ logo: IMG.mark || null }, SHIP));
    for (let x = 0; x < LW; x++) if (rnd() < 0.5) R(x, SHIP.keel - 1 + Math.floor(rnd() * 3), 1, 1, K.foam);
    SHIPFG = PXP.bulwark(LW, LH, SHIP);
    R(0, FIN_Y, LW, LH - FIN_Y, C.sand);
    for (let y = FIN_Y; y < LH; y++) for (let x = 0; x < LW; x++) {
      const r = rnd();
      if (r < 0.05) R(x, y, 1, 1, C.sand2); else if (r < 0.085) R(x, y, 1, 1, C.sand3); else if (r < 0.089) { R(x, y, 1, 1, C.sand4); R(x, y - 1, 1, 1, C.sand3); }
    }
    for (let i = 0; i < 14; i++) {
      const px = Math.floor(rnd() * LW), py = FIN_Y + 10 + Math.floor(rnd() * (LH - FIN_Y - 10)), rr = 4 + Math.floor(rnd() * 9);
      for (let y = -rr; y <= rr; y++) for (let x = -rr * 2; x <= rr * 2; x++) if ((x * x) / 4 + y * y < rr * rr && (x + y) % 2 === 0) R(px + x, py + y, 1, 1, C.sand5);
    }
    for (let i = 0; i < 8; i++) PXP.shell(g, 6 + Math.floor(rnd() * (LW - 12)), FIN_Y + 12 + Math.floor(rnd() * (START_Y - FIN_Y - 20)), rnd);
    if (IMG.mark) { g.globalAlpha = 0.5; const mw = 150, mh = 72; g.drawImage(PX.pixelImage(IMG.mark, mw, mh, C.sand5), (LW - mw) >> 1, Math.round((FIN_Y + START_Y) / 2 - mh / 2)); g.globalAlpha = 1; }
    PXP.dock(g, 0, LW, SHIP.dock, FIN_Y);
    labels.push({ t: 'SAFE ZONE', x: 24, y: 87, size: 6.5, col: '#e9ffe9', out: '#1d6b3a' }, { t: 'SAFE ZONE', x: LW - 24, y: 87, size: 6.5, col: '#e9ffe9', out: '#1d6b3a' });
    PXP.dockEdge(g, 0, LW, FIN_Y, 50);
    R(0, START_Y + 1, LW, 2, C.white); R(0, START_Y + 3, LW, 1, C.cream2);
    labels.push({ t: 'START', x: 4, y: START_Y + 8.5, size: 6, col: C.sand4, align: 'left' });
    for (const q of [0.25, 0.5, 0.75]) { const y = progY(q); for (let x = 2; x < LW - 2; x += 6) R(x, y, 3, 1, C.sand5); }
    PX.ell(g, DOLL.x, DOLL.y + 1, 18, 3, 'rgba(20,16,34,.3)');
    LABELS = labels;
    return c;
  }

  function buildBG() {
    if (PIR()) return buildPirateBG();
    const c = PX.cnv(LW, LH), g = c.getContext('2d'), R = (x, y, w, h, col) => PX.R(g, x, y, w, h, col);
    const rnd = PX.rng(20261016);
    const labels = [];
    const bands = [[0, C.sky1], [15, C.sky2], [31, C.sky3], [48, C.sky4]];
    bands.forEach(([y0, col], i) => {
      const y1 = i + 1 < bands.length ? bands[i + 1][0] : WALL;
      R(0, y0, LW, y1 - y0, col);
      if (i + 1 < bands.length) for (let x = 0; x < LW; x++) { if (x % 2 === 0) R(x, y1 - 1, 1, 1, bands[i + 1][1]); if (x % 2 === 1) R(x, y1, 1, 1, col); }
    });
    const cloud = (cx, cy, s) => {
      const parts = [[0, 0, 7], [-9, 2, 5], [9, 2, 6], [-4, -3, 5], [5, -4, 5], [15, 4, 4], [-15, 4, 3]];
      for (const [dx, dy, r] of parts) PX.disc(g, Math.round(cx + dx * s), Math.round(cy + dy * s), Math.round(r * s), C.cloud2);
      for (const [dx, dy, r] of parts) PX.disc(g, Math.round(cx + dx * s), Math.round(cy + dy * s) - 1, Math.max(1, Math.round(r * s) - 1), C.cloud);
    };
    [[22, 22, 0.9], [176, 16, 1], [150, 46, 0.6], [40, 50, 0.6]].forEach(([x, y, s]) => cloud(x, y, s));
    for (let x = 0; x < LW; x++) {
      const y = 3 + Math.round(Math.sin((x / LW) * Math.PI * 2) * 2 + 2); R(x, y, 1, 1, C.ink2);
      if (x % 12 === 6) {
        const cols = [C.gold, C.white, C.red, C.blue, C.jacket];
        const col = cols[(x / 12 | 0) % cols.length];
        for (let k = 0; k < 6; k++) R(x - 3 + Math.floor(k / 2), y + 1 + k, Math.max(1, 7 - Math.floor(k / 2) * 2), 1, col);
      }
    }
    R(0, WALL - 4, LW, 1, C.gold3); R(0, WALL - 3, LW, 2, C.gold); R(0, WALL - 1, LW, 1, C.gold2);
    // ground
    R(0, WALL, LW, LH - WALL, C.sand);
    for (let y = WALL; y < LH; y++) for (let x = 0; x < LW; x++) {
      const r = rnd();
      if (r < 0.05) R(x, y, 1, 1, C.sand2); else if (r < 0.085) R(x, y, 1, 1, C.sand3); else if (r < 0.089) { R(x, y, 1, 1, C.sand4); R(x, y - 1, 1, 1, C.sand3); }
    }
    for (let i = 0; i < 16; i++) {
      const px = Math.floor(rnd() * LW), py = WALL + 10 + Math.floor(rnd() * (LH - WALL - 10)), rr = 4 + Math.floor(rnd() * 9);
      for (let y = -rr; y <= rr; y++) for (let x = -rr * 2; x <= rr * 2; x++) if ((x * x) / 4 + y * y < rr * rr && (x + y) % 2 === 0) R(px + x, py + y, 1, 1, C.sand5);
    }
    R(0, WALL, LW, 2, C.sand4); R(0, WALL + 2, LW, 1, C.sand5);
    if (IMG.mark) { g.globalAlpha = 0.5; const mw = 150, mh = 72; g.drawImage(PX.pixelImage(IMG.mark, mw, mh, C.sand5), (LW - mw) >> 1, Math.round((FIN_Y + START_Y) / 2 - mh / 2)); g.globalAlpha = 1; }
    // safe zone
    g.fillStyle = 'rgba(60,196,106,0.42)'; g.fillRect(0, WALL + 3, LW, FIN_Y - WALL - 5);
    for (let x = 0; x < LW; x += 2) { R(x, WALL + 3, 1, 1, '#2f9e55'); R(x + 1, FIN_Y - 3, 1, 1, '#2f9e55'); }
    labels.push({ t: 'SAFE ZONE', x: 24, y: 84, size: 6.5, col: '#e9ffe9', out: '#1d6b3a' }, { t: 'SAFE ZONE', x: LW - 24, y: 84, size: 6.5, col: '#e9ffe9', out: '#1d6b3a' });
    R(0, FIN_Y - 2, LW, 4, C.red); R(0, FIN_Y - 2, LW, 1, '#ff6a7e'); R(0, FIN_Y + 2, LW, 1, C.red2);
    for (let i = 0; i < 24; i++) R(Math.floor(rnd() * LW), FIN_Y - 2 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 2), 1, rnd() < 0.5 ? C.sand : C.sand2);
    R(0, START_Y + 1, LW, 2, C.white); R(0, START_Y + 3, LW, 1, C.cream2);
    labels.push({ t: 'START', x: 4, y: START_Y + 8.5, size: 6, col: C.sand4, align: 'left' });
    for (const q of [0.25, 0.5, 0.75]) { const y = progY(q); for (let x = 2; x < LW - 2; x += 6) R(x, y, 3, 1, C.sand5); }
    // small bare tree at the side of the dais
    const tx = 178, ty = 89;
    PX.ell(g, tx, ty + 1, 8, 2, 'rgba(20,16,34,.25)');
    for (let y = 30; y <= ty; y++) { const w = y > 78 ? 5 : 4; R(tx - (w >> 1), y, w, 1, C.wood); R(tx - (w >> 1), y, 1, 1, C.wood3); R(tx + (w >> 1) - 1, y, 1, 1, C.wood2); }
    const br = [[tx, 58, tx + 12, 44], [tx, 50, tx - 12, 36], [tx - 6, 42, tx - 9, 30], [tx, 40, tx + 8, 24], [tx, 34, tx - 5, 22]];
    for (const [a, b, c2, d] of br) { PX.line(g, a, b, c2, d, C.wood2); PX.line(g, a + 1, b, c2 + 1, d, C.wood); }
    for (let i = 0; i < 14; i++) { const lx = tx - 13 + Math.floor(rnd() * 28), ly = 20 + Math.floor(rnd() * 28); R(lx, ly, 2, 2, rnd() < 0.5 ? '#c78a3a' : '#e0a94c'); }
    PX.ell(g, DOLL.x, DOLL.y + 1, 19, 4, C.ink); PX.ell(g, DOLL.x, DOLL.y, 18, 3, C.navy3); PX.ell(g, DOLL.x, DOLL.y - 1, 16, 2, C.navy); R(DOLL.x - 18, DOLL.y, 37, 1, C.gold);
    LABELS = labels;
    return c;
  }

  function drawLabels(list, sx, sy) {
    ctx.textBaseline = 'middle';
    for (const L0 of list) {
      const fs = Math.max(12, Math.round(L0.size * 1.23 * view.s));
      ctx.font = `400 ${fs}px ${FONT}`;
      const X = view.ox + (L0.x + sx) * view.s, Y = view.oy + (L0.y + sy) * view.s;
      ctx.textAlign = L0.align || 'center';
      if (L0.box) {
        const w = ctx.measureText(L0.t).width, pad = fs * 0.35, h = fs * 1.25;
        const bx = X - w / 2 - pad;
        ctx.fillStyle = C.ink; ctx.fillRect(Math.round(bx - 2), Math.round(Y - h / 2 - 2), Math.round(w + pad * 2 + 4), Math.round(h + 4));
        ctx.fillStyle = L0.box; ctx.fillRect(Math.round(bx), Math.round(Y - h / 2), Math.round(w + pad * 2), Math.round(h));
      }
      if (L0.out) { ctx.lineWidth = Math.max(2, fs * (L0.thick || 0.18)); ctx.strokeStyle = L0.out; ctx.lineJoin = 'round'; ctx.strokeText(L0.t, X, Y); }
      ctx.fillStyle = L0.col || C.white;
      ctx.fillText(L0.t, X, Y);
    }
  }

  /* ---------------------------------------------------------------- state from the big screen */
  const S = { phase: 'lobby', phaseAt: 0, players: new Map(), me: '', turnFrom: 'front', turnTo: 'front', turnT0: 0, turnMs: 1, shake: 0, flash: 0, lastShot: 0, final: false, seen: false, deckN: [0, 0] };
  const STATUS = { r: 'ready', w: 'waiting', a: 'alive', o: 'out', x: 'won' };
  let onMyShot = null;

  function dollView(now) {
    const k = Math.min(1, (now - S.turnT0) / S.turnMs);
    if (S.turnFrom === S.turnTo || k >= 1) return S.turnTo;
    if (k < 0.4) return S.turnFrom;
    if (k < 0.75) return 'side';
    return S.turnTo;
  }
  function turn(to, ms) { S.turnFrom = dollView(performance.now()); S.turnTo = to; S.turnT0 = performance.now(); S.turnMs = Math.max(1, ms); }

  function setPhase(ph) {
    const prev = S.phase;
    S.phase = ph; S.phaseAt = performance.now();
    if (ph === 'lobby' || ph === 'countdown') S.deckN = [0, 0];
    switch (ph) {
      case 'lobby': turn('front', 1); S.final = false; break;
      case 'countdown': S.final = false; turn('back', 500); break;
      case 'green': if (prev !== 'turnback') turn('back', 400); break;
      case 'turning': turn('front', 300); break;
      case 'red': turn('front', 1); break;
      case 'turnback': turn('back', 450); break;
      case 'ended': turn('front', 500); break;
    }
  }

  function update(st, me) {
    S.me = me;
    const now = performance.now();
    const first = !S.seen; S.seen = true;
    if (st.ph !== S.phase) setPhase(st.ph);
    const ids = new Set();
    for (const [id, e] of Object.entries(st.pl || {})) {
      const [num, sc, prog, rank, lane, nm, g] = e;
      ids.add(id);
      const status = STATUS[sc] || 'ready';
      let r = S.players.get(id);
      if (!r) { r = { id, dpos: prog / 1000, anim: Math.random() * 4, lastStepIdx: 0, prog, progAt: now, movedAt: 0 }; S.players.set(id, r); }
      if (r.num !== num || r.gender !== g || !r.look) { r.look = PX.look('p' + num, g); r.gender = g; }
      if (prog !== r.prog) { r.movedAt = now; r.vel = (prog - r.prog) / 1000 / Math.max(0.1, (now - r.progAt) / 1000); r.prog = prog; r.progAt = now; }
      const prevStatus = r.status;
      Object.assign(r, { num, name: nm, rank, lane: (lane || 0) / 100, local: id === me });
      if (status === 'out' && prevStatus !== 'out') {
        if (prevStatus === 'alive' && !first) caught(r);
        else { r.status = 'out'; r.outX = laneX(r.lane); r.outY = progY(prog / 1000); r.fallDir = r.outX < DOLL.x ? 'fallL' : 'fallR'; r.shotAt = now - 5000; r.dpos = prog / 1000; }
      } else if (status === 'won' && prevStatus !== 'won') {
        r.status = 'won';
        if (prevStatus === 'alive' && !first) burst(laneX(r.lane), FIN_Y - 6, 40);
      } else if (status !== 'out') {
        r.status = status;
        if (status !== 'won') { r.shotAt = 0; r.outX = r.outY = null; r.shots = null; r.fleeAt = 0; }
      }
    }
    for (const id of [...S.players.keys()]) if (!ids.has(id)) S.players.delete(id);
  }

  function caught(r) {
    r.status = 'out';
    const t = performance.now();
    const fleeMs = PIR() ? 1400 + Math.random() * 700 : 1000 + Math.random() * 900;
    r.fleeAt = t;
    r.shotAt = Math.max(t + fleeMs, S.lastShot + 120);
    S.lastShot = r.shotAt;
    r.fleeMs = r.shotAt - t;
    r.fleeStyle = ['side', 'back', 'zigzag', 'scatter', 'forward'][Math.floor(Math.random() * 5)];
    r.fleeDir = laneX(r.lane) < DOLL.x ? -1 : 1;
    if (Math.random() < 0.3) r.fleeDir *= -1;
    r.guard = GUARDS[laneX(r.lane) < DOLL.x ? 0 : 1];
    r.fallDir = r.fleeDir < 0 ? 'fallL' : 'fallR';
    r.startX = laneX(r.lane); r.startY = progY(r.dpos);
    const end = fleePos(r, 1); r.outX = end.x; r.outY = end.y;
    if (PIR()) {
      // pirate edition: barrels — 1-2 misses, then the hit
      const n = 1 + Math.floor(Math.random() * 2);
      r.shots = [];
      for (let i = n; i >= 1; i--) r.shots.push({ at: r.shotAt - i * (300 + Math.random() * 90), miss: true, fl: 380, dx: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6), dy: Math.random() * 8 - 2 });
      r.shots.push({ at: r.shotAt, miss: false, fl: 420 });
      for (const sh of r.shots) {
        const p = fleePos(r, Math.min(1, (sh.at - r.fleeAt) / r.fleeMs));
        sh.tx = Math.round(p.x + (sh.miss ? sh.dx : 0)); sh.ty = Math.round(p.y + (sh.miss ? sh.dy : -11));
        sh.arc = 14 + Math.hypot(sh.tx - r.guard.hand.x, sh.ty - r.guard.hand.y) * 0.18;
        setTimeout(() => { S.shake = sh.miss ? 1 : (r.local ? 4 : 2); if (!sh.miss && r.local) S.flash = 0.3; splinters(sh.tx, sh.ty, sh.miss ? 8 : 12); }, Math.max(0, sh.at - t));
      }
      if (r.local && onMyShot) setTimeout(onMyShot, Math.max(0, r.shotAt - t));
      if (S.phase === 'green' && !S.final) { S.final = true; turn('front', 250); }
      return;
    }
    const misses = 1 + Math.floor(Math.random() * 2);
    r.shots = [];
    for (let i = misses; i >= 1; i--) r.shots.push({ at: r.shotAt - i * (180 + Math.random() * 120), miss: true, dx: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8), dy: Math.random() * 6 - 3 });
    r.shots.push({ at: r.shotAt, miss: false }, { at: r.shotAt + 110, miss: false });
    for (const sh of r.shots) setTimeout(() => { S.shake = sh.miss ? 1 : (r.local ? 4 : 2); if (!sh.miss && r.local) S.flash = 0.3; }, Math.max(0, sh.at - t));
    if (r.local && onMyShot) setTimeout(onMyShot, Math.max(0, r.shotAt - t));
    if (S.phase === 'green' && !S.final) { S.final = true; turn('front', 250); }   // shoot-out of those left in the unsafe zone
  }
  function fleePos(r, k) {
    k = Math.max(0, Math.min(1, k));
    const e = 1 - Math.pow(1 - k, 2), d = r.fleeDir || 1;
    let dx = 0, dy = 0;
    switch (r.fleeStyle) {
      case 'side': dx = d * 26 * e; dy = Math.sin(k * 9) * 2; break;
      case 'back': dx = Math.sin(k * 7) * 6; dy = 36 * e; break;
      case 'zigzag': dx = Math.sin(k * Math.PI * 4) * 10; dy = 16 * e; break;
      case 'scatter': dx = d * 18 * e; dy = 24 * e; break;
      default: dx = d * 6 * e; dy = -20 * e;
    }
    return { x: Math.round(Math.max(FX0 + 6, Math.min(FX1 - 6, r.startX + dx))), y: Math.round(Math.max(FIN_Y + 8, Math.min(START_Y, r.startY + dy))) };
  }

  /* ---------------------------------------------------------------- particles */
  const POOL = Array.from({ length: 300 }, () => ({ on: false }));
  const CONF = [C.gold, C.gold3, C.blue3, C.jacket, C.white, C.red, C.green];
  function spawn(o) { for (const p of POOL) if (!p.on) { Object.assign(p, o); p.on = true; return p; } return null; }
  function burst(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 80; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, g: 160, life: 1.4 + Math.random() * 1.2, col: CONF[(Math.random() * CONF.length) | 0], w: Math.random() < 0.5 ? 2 : 1, h: 1, kind: 'conf' }); } }
  function dust(x, y) { for (let i = 0; i < 2; i++) spawn({ x: x + (Math.random() * 6 - 3), y: y - 1, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 8, g: 30, life: 0.35 + Math.random() * 0.25, col: Math.random() < 0.5 ? C.sand3 : C.cream2, w: 1, h: 1, kind: 'dust' }); }
  function splinters(x, y, n) {
    const cols = [PXP.K.plank, PXP.K.plank2, PXP.K.plank3, PXP.K.plank4, C.steel];
    for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(), v = 25 + Math.random() * 55; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 220, life: 0.5 + Math.random() * 0.5, col: cols[(Math.random() * cols.length) | 0], w: 2, h: 1, kind: 'conf' }); }
  }
  function sparkle(x, y) { spawn({ x: x + (Math.random() * 12 - 6), y: y - 6 - Math.random() * 16, vx: 0, vy: -10, g: 0, life: 0.5, col: Math.random() < 0.5 ? C.gold3 : C.white, w: 1, h: 1, kind: 'spark' }); }
  function drawParticles(dt) {
    for (const p of POOL) {
      if (!p.on) continue;
      p.life -= dt; if (p.life <= 0 || p.y > LH + 4) { p.on = false; continue; }
      p.vy += p.g * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt;
      lg.fillStyle = p.col;
      if (p.kind === 'conf') { const flip = Math.floor(p.life * 12) % 2; lg.fillRect(p.x | 0, p.y | 0, flip ? p.w : p.h, flip ? p.h : p.w); }
      else if (p.kind === 'spark') { lg.fillRect(p.x | 0, p.y | 0, 1, 1); if (p.life > 0.25) { lg.fillRect((p.x | 0) - 1, p.y | 0, 3, 1); lg.fillRect(p.x | 0, (p.y | 0) - 1, 1, 3); } }
      else lg.fillRect(p.x | 0, p.y | 0, 1, 1);
    }
  }
  function drawBeam(t) {
    if (!(S.phase === 'red' || S.phase === 'turnback')) return;
    const ex = DOLL.x, ey = DOLL.y - 52;
    const cx = LW / 2 + Math.sin(t * 1.5) * 70, hw = 26, ty = Math.min(LH - 30, 260);
    lg.fillStyle = 'rgba(255,40,70,0.30)';
    for (let y = ey + 6; y < ty; y++) {
      const k = (y - ey) / (ty - ey), mid = ex + (cx - ex) * k, w = 2 + hw * k;
      for (let x = Math.round(mid - w); x <= Math.round(mid + w); x++) if ((x + y) % 2 === 0) lg.fillRect(x, y, 1, 1);
    }
  }

  function drawBeamPirate(t) {
    if (!(S.phase === 'red' || S.phase === 'turnback')) return;
    const ex = DOLL.x - 5, ey = DOLL.y - 52;
    const cx = LW / 2 + Math.sin(t * 1.5) * 70, hw = 26, ty = Math.min(LH - 30, 260);
    lg.fillStyle = 'rgba(255,196,64,0.30)';
    for (let y = ey + 6; y < ty; y++) {
      const k = (y - ey) / (ty - ey), mid = ex + (cx - ex) * k, w = 2 + hw * k;
      for (let x = Math.round(mid - w); x <= Math.round(mid + w); x++) if ((x + y) % 2 === 0) lg.fillRect(x, y, 1, 1);
    }
  }
  function barrelAt(r, sh, now) {
    const k = (now - (sh.at - sh.fl)) / sh.fl;
    if (k < 0 || k > 1) return null;
    const h = r.guard.hand;
    return { x: h.x + (sh.tx - h.x) * k, y: h.y + (sh.ty - h.y) * k - sh.arc * 4 * k * (1 - k), spin: Math.floor(k * 8) % 2 };
  }
  function crewPose(gd, now) {
    let pose = 'hold';
    for (const r of S.players.values()) if (r.guard === gd && r.shots) for (const sh of r.shots) {
      const t0 = sh.at - sh.fl;
      if (now >= t0 - 220 && now < t0) pose = 'up';
      else if (now >= t0 && now < t0 + 200 && pose !== 'up') pose = 'throw';
    }
    return pose;
  }
  function boardPos(r, x, y, now, arrived) {
    if (!r.board) {
      if (!arrived) return null;
      const plank = SHIP.planks.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
      const side = plank < SHIP.cx ? 0 : 1, n = S.deckN[side]++;
      const slot = plank + (side ? -1 : 1) * (18 + n * 13);
      r.board = { t0: now, path: PXP.boardPath(x, y, plank, SHIP.dock + 4, SHIP.deck, slot) };
    }
    return PXP.along(r.board.path, (now - r.board.t0) / 1000 * 60);
  }
  function drawDizzyOut(r, x, y, now) {
    const t = now / 1000, e = now - r.shotAt;
    if (e < 0) {
      const k = r.fleeAt ? (now - r.fleeAt) / r.fleeMs : 1;
      const towardCamera = r.fleeStyle === 'back' || (r.fleeStyle === 'scatter' && k > 0.2);
      const fr = RUN[Math.floor(now / 70) % 4];
      drawSprite(PX.charSprite(r.look, towardCamera ? 'front' : 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
      if (Math.floor(now / 160) % 3 === 0) dust(x, y);
      if (Math.floor(now / 70) % 2 === 0) {
        lg.fillStyle = C.red;
        const x0 = x - 9, x1 = x + 8, y0 = y - 24, y1 = y + 2;
        lg.fillRect(x0, y0, 4, 1); lg.fillRect(x0, y0, 1, 4); lg.fillRect(x1 - 3, y0, 4, 1); lg.fillRect(x1, y0, 1, 4);
        lg.fillRect(x0, y1, 4, 1); lg.fillRect(x0, y1 - 3, 1, 4); lg.fillRect(x1 - 3, y1, 4, 1); lg.fillRect(x1, y1 - 3, 1, 4);
      }
      if (r.local) drawYouArrow(x, y - 26, t);
      return;
    }
    if (e < 80) { drawSprite(PX.charSprite(r.look, 'back', 'idle', 'flash'), x, y - 1); return; }
    let ax = x, ay = y - 30;
    if (e < 650) {
      drawSprite(PX.charSprite(r.look, 'back', 'idle', 'grey'), x + (Math.floor(e / 90) % 2 ? -1 : 1), y);
      PXP.dizzy(lg, x, y - 22, t, true);
    } else {
      const s = PX.charSprite(r.look, 'back', 'idle', r.fallDir + 'g');
      const ox = r.fallDir === 'fallL' ? -6 : 6, dx = Math.round(x + ox - s.width / 2), dy = Math.round(y - s.height + 1);
      lg.drawImage(s, dx, dy);
      const hx = r.fallDir === 'fallL' ? dx + 4 : dx + s.width - 4;
      PXP.dizzy(lg, hx, dy - 3, t, true);
      ax = x + ox; ay = y - 18;
    }
    if (e < 1500) TAGS.push({ t: 'OUT!', x, y: y - 30 - (e / 1500) * 12, size: 8, col: C.red, out: C.ink });
    if (r.local) drawYouArrow(ax, ay, t);
  }
  function drawBoarder(r, x, y, t) {
    if (!r.bdone) {
      const fr = RUN[Math.floor(r.anim) % 4];
      lg.fillStyle = 'rgba(40,24,8,0.28)'; lg.fillRect(x - 5, y, 11, 2);
      drawSprite(PX.charSprite(r.look, 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
    } else {
      drawSprite(PX.charSprite(r.look, 'front', Math.floor(t * 4) % 2 ? 'cheer' : 'cheer2'), x, y);
      if (Math.random() < 0.1) sparkle(x, y - 8);
    }
    TAGS.push({ t: '#' + r.rank, x, y: r.bdone ? y + 8 : y - 28, size: 7, col: C.ink, box: C.gold });
    if (r.local) drawYouArrow(x, r.bdone ? y - 24 : y - 36, t);
  }

  /* ---------------------------------------------------------------- players */
  const mix = id => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const RUN = ['a', 'idle', 'c', 'idle'];
  function drawSprite(s, x, y) { lg.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height + 1)); }
  function collect(now, dt, list) {
    const lobbyList = S.phase === 'lobby' ? [...S.players.values()].filter(r => r.status !== 'waiting').sort((a, b) => mix(a.id) - mix(b.id)) : null;
    for (const r of S.players.values()) {
      if (r.status === 'waiting') continue;
      let lane = r.lane;
      if (lobbyList) { /* lane comes from the big screen's random line-up */ }
      else if (r.status === 'ready') continue;
      // smooth between the ~3 updates a second, with a little look-ahead while running
      let target = r.prog / 1000;
      if (r.status === 'alive' && r.vel > 0 && now - r.progAt < 400) target += r.vel * Math.min(0.33, (now - r.progAt) / 1000);
      if (lobbyList) target = 0;
      if (r.status === 'won') target = 1.08 + (r.rank % 2) * 0.03;
      const before = r.dpos;
      if (r.status !== 'out') r.dpos += (target - r.dpos) * Math.min(1, dt * (r.status === 'won' ? 3 : 8));
      const running = (r.status === 'alive' && (now - r.movedAt < 450 || Math.abs(r.dpos - before) > dt * 0.02)) || (r.status === 'won' && Math.abs(target - r.dpos) > 0.006);
      r.running = running;
      if (running) {
        r.anim += dt * 11;
        const idx = Math.floor(r.anim);
        if (idx !== r.lastStepIdx) { r.lastStepIdx = idx; if (RUN[idx % 4] !== 'idle' && Math.random() < 0.5) dust(laneX(lane), progY(r.dpos)); }
      }
      let x = r.status === 'out' && r.outX != null ? r.outX : laneX(lane);
      let y = r.status === 'out' && r.outY != null ? r.outY : progY(r.dpos);
      if (r.status === 'out' && r.shotAt && now < r.shotAt && r.fleeAt) { const fp = fleePos(r, (now - r.fleeAt) / r.fleeMs); x = fp.x; y = fp.y; }
      if (r.status !== 'won') r.board = null;
      else if (PIR()) {
        const b = boardPos(r, x, y, now, Math.abs((1.08 + (r.rank % 2) * 0.03) - r.dpos) < 0.01);
        if (b) { x = Math.round(b.x); y = Math.round(b.y); r.bdone = b.done; if (!b.done) r.anim += dt * 11; }
      }
      r.sx = x; r.sy = y;
      list.push({ y: y + (r.local ? 0.5 : 0), draw: () => drawPlayer(r, x, y, now) });
    }
  }
  function drawPlayer(r, x, y, now) {
    const t = now / 1000;
    if (PIR() && r.status === 'won' && r.board) { drawBoarder(r, x, y, t); return; }
    lg.fillStyle = 'rgba(40,24,8,0.28)'; lg.fillRect(x - 5, y, 11, 2);
    if (PIR() && r.status === 'out' && r.shotAt) { drawDizzyOut(r, x, y, now); return; }
    if (r.status === 'out' && r.shotAt) {
      const e = now - r.shotAt;
      if (e < 0) {
        const k = r.fleeAt ? (now - r.fleeAt) / r.fleeMs : 1;
        const towardCamera = r.fleeStyle === 'back' || (r.fleeStyle === 'scatter' && k > 0.2);
        const fr = RUN[Math.floor(now / 70) % 4];
        drawSprite(PX.charSprite(r.look, towardCamera ? 'front' : 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
        if (Math.floor(now / 160) % 3 === 0) dust(x, y);
        if (Math.floor(now / 70) % 2 === 0) {
          lg.fillStyle = C.red;
          const x0 = x - 9, x1 = x + 8, y0 = y - 24, y1 = y + 2;
          lg.fillRect(x0, y0, 4, 1); lg.fillRect(x0, y0, 1, 4); lg.fillRect(x1 - 3, y0, 4, 1); lg.fillRect(x1, y0, 1, 4);
          lg.fillRect(x0, y1, 4, 1); lg.fillRect(x0, y1 - 3, 1, 4); lg.fillRect(x1 - 3, y1, 4, 1); lg.fillRect(x1, y1 - 3, 1, 4);
        }
        if (r.guard) PX.line(lg, r.guard.muzzle.x, r.guard.muzzle.y, x, y - 12, 'rgba(255,40,70,0.9)', 2);
        if (r.local) drawYouArrow(x, y - 26, t);
        return;
      }
      if (e > 60) {
        const k = Math.min(1, (e - 60) / 650), ox = r.fallDir === 'fallL' ? -5 : 5;
        PX.ell(lg, x + ox, y - 1, Math.max(1, Math.round(9 * k)), Math.max(1, Math.round(3 * k)), C.blood);
        if (k > 0.5) { lg.fillStyle = C.blood2; lg.fillRect(x + ox - 3, y - 2, 3, 1); }
      }
      if (e < 80) { drawSprite(PX.charSprite(r.look, 'back', 'idle', 'flash'), x, y - 1); return; }
      const s = PX.charSprite(r.look, 'back', 'idle', e > 700 ? r.fallDir + 'g' : r.fallDir);
      const ox = r.fallDir === 'fallL' ? -6 : 6;
      lg.drawImage(s, Math.round(x + ox - s.width / 2), Math.round(y - s.height + 1));
      if (e < 1500) TAGS.push({ t: 'OUT!', x, y: y - 28 - (e / 1500) * 12, size: 8, col: C.red, out: C.ink });
      if (r.local) drawYouArrow(x + ox, y - 14, t);
      return;
    }
    if (r.status === 'won') {
      const arrived = Math.abs((1.08 + (r.rank % 2) * 0.03) - r.dpos) < 0.01;
      lg.fillStyle = 'rgba(255,217,122,0.55)'; lg.fillRect(x - 7, y - 1, 15, 3);
      const frame = arrived ? (Math.floor(t * 4) % 2 ? 'cheer' : 'cheer2') : RUN[Math.floor(r.anim) % 4];
      drawSprite(PX.charSprite(r.look, arrived ? 'front' : 'back', frame), x, y);
      if (arrived && Math.random() < 0.12) sparkle(x, y);
      TAGS.push({ t: '#' + r.rank, x, y: y - 28, size: 7, col: C.ink, box: C.gold });
      if (r.local) drawYouArrow(x, y - 36, t);
      return;
    }
    const frame = r.running ? RUN[Math.floor(r.anim) % 4] : 'idle';
    const bob = r.running && frame === 'idle' ? -1 : 0;
    drawSprite(PX.charSprite(r.look, 'back', frame), x, y + bob);
    if (r.local) drawYouArrow(x, y - 26, t);
  }
  function drawYouArrow(x, y, t) {
    const by = Math.round(y - 8 + Math.sin(t * 6) * 2);
    lg.fillStyle = C.ink;
    for (let i = 0; i < 7; i++) lg.fillRect(x - 6 + i, by - 1 + i, 13 - i * 2, 1);
    lg.fillRect(x - 6, by - 1, 13, 1); lg.fillRect(x, by + 6, 1, 1);
    lg.fillStyle = '#39e36b'; for (let i = 0; i < 6; i++) lg.fillRect(x - 5 + i, by + i, 11 - i * 2, 1);
    lg.fillStyle = '#9dffb8'; lg.fillRect(x - 5, by, 11, 1);
    lg.fillStyle = '#1f9e47'; for (let i = 1; i < 6; i++) lg.fillRect(x + 4 - i, by + i, 1, 1);
  }

  /* ---------------------------------------------------------------- frame */
  let last = performance.now(), running = false;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!cv.clientWidth) return;
    if (cv.width !== Math.round(cv.clientWidth * Math.min(3, window.devicePixelRatio || 1))) resize();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    lg.drawImage(BG, 0, 0);
    TAGS.length = 0;
    const list = [];
    const dv = dollView(now);
    const red = S.phase === 'red' || S.phase === 'turnback';
    const hop = dv === 'side' ? -1 : 0;
    if (PIR()) {
      list.push({ y: DOLL.y, draw: () => {
        const s = PXP.captain(dv, red && dv !== 'back', red && dv === 'front'); lg.drawImage(s, DOLL.x - 28, DOLL.y - s.height + 3 + hop);
        if (red && dv === 'front' && Math.floor(t * 8) % 2) { lg.fillStyle = 'rgba(255,60,80,0.55)'; lg.fillRect(DOLL.x - 8, DOLL.y - 55, 7, 7); }
      } });
      for (const gd of GUARDS) list.push({ y: gd.y, draw: () => { const s = PXP.crew(gd.kind, crewPose(gd, now), gd.mirror); lg.drawImage(s, gd.x - 15, gd.y - s.height + 3); } });
      if (SHIPFG) list.push({ y: SHIP.deck + 0.5, draw: () => lg.drawImage(SHIPFG, 0, 0) });
    } else {
    list.push({ y: DOLL.y, draw: () => {
      const s = PX.doll(dv, red && dv !== 'back', 0); lg.drawImage(s, DOLL.x - 22, DOLL.y - s.height + 3 + hop);
      if (red && dv === 'front' && Math.floor(t * 8) % 2) { lg.fillStyle = 'rgba(255,60,80,0.5)'; lg.fillRect(DOLL.x - 8, DOLL.y - 52, 5, 5); lg.fillRect(DOLL.x + 3, DOLL.y - 52, 5, 5); }
    } });
    for (const gd of GUARDS) {
      let firing = false;
      for (const r of S.players.values()) if (r.guard === gd && r.shots) for (const sh of r.shots) if (now >= sh.at && now - sh.at < 80) firing = true;
      list.push({ y: gd.y, draw: () => { const s = PX.guard(gd.shape, firing, gd.mirror); lg.drawImage(s, gd.mirror ? gd.x - 19 : gd.x - 10, gd.y - 31); } });
    }
    }
    collect(now, dt, list);
    list.sort((a, b) => a.y - b.y);
    if (PIR()) drawBeamPirate(t); else drawBeam(t);
    for (const it of list) it.draw();
    if (PIR()) for (const r of S.players.values()) {
      if (r.status !== 'out' || !r.shots) continue;
      for (const sh of r.shots) {
        const b = barrelAt(r, sh, now); if (!b) continue;
        const s = PXP.barrel(b.spin === 1);
        lg.drawImage(s, Math.round(b.x - s.width / 2), Math.round(b.y - s.height / 2));
      }
    }
    if (!PIR()) for (const r of S.players.values()) {
      if (r.status !== 'out' || !r.shots) continue;
      for (const sh of r.shots) {
        const e = now - sh.at;
        if (e < 0 || e > 260) continue;
        const p = fleePos(r, Math.min(1, (sh.at - r.fleeAt) / r.fleeMs));
        const tx = Math.round(p.x + (sh.miss ? sh.dx : 0)), ty = Math.round(p.y + (sh.miss ? sh.dy : -12));
        if (e < 70) { PX.line(lg, r.guard.muzzle.x, r.guard.muzzle.y, tx, ty, '#fff6b0'); lg.fillStyle = C.white; lg.fillRect(tx - 1, ty - 1, 3, 3); }
        if (sh.miss && !sh.puffed) { sh.puffed = true; for (let i = 0; i < 4; i++) dust(tx, ty + 1); }
      }
    }
    drawParticles(dt);
    if (S.flash > 0.01) { lg.fillStyle = `rgba(255,255,255,${S.flash})`; lg.fillRect(0, 0, LW, LH); S.flash *= Math.pow(0.0005, dt); }
    // countdown in the middle of the field
    if (S.phase === 'countdown') { const n = 3 - Math.floor((now - S.phaseAt) / 1000); if (n >= 1) TAGS.push({ t: String(n), x: LW / 2, y: (FIN_Y + START_Y) / 2, size: 30, weight: 800, col: C.gold3, out: C.ink, thick: 0.22 }); }
    else if (S.phase === 'green' && now - S.phaseAt < 900 && S.prevWasCount) TAGS.push({ t: 'GO!', x: LW / 2, y: (FIN_Y + START_Y) / 2, size: 26, weight: 800, col: C.gold3, out: C.ink, thick: 0.22 });
    if (S.phase !== 'green' && S.phase !== 'countdown') S.prevWasCount = false;
    if (S.phase === 'countdown') S.prevWasCount = true;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.navy2; ctx.fillRect(0, 0, cv.width, cv.height);
    let sx = 0, sy = 0;
    if (S.shake > 0.3) { sx = Math.round((Math.random() - 0.5) * S.shake * 2); sy = Math.round((Math.random() - 0.5) * S.shake * 2); S.shake *= Math.pow(0.02, dt); } else S.shake = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L, view.ox + sx * view.s, view.oy + sy * view.s, LW * view.s, LH * view.s);
    drawLabels(LABELS, sx, sy);
    if (S.bubble && (S.phase === 'green' || S.phase === 'turning')) {
      // speech bubble above the doll, filled in word by word with her voice
      const fs = Math.max(13, Math.round(8 * view.s)); ctx.font = `400 ${fs}px ${FONT}`;
      const maxW = LW * view.s * 0.9, words = S.bubble.split(' '), lines = [''];
      for (const w of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (ctx.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
      const lh = fs * 1.25, bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + fs, bh = lines.length * lh + fs * 0.5;
      const cx = view.ox + LW / 2 * view.s, by = view.oy + 4 * view.s;
      ctx.fillStyle = C.ink; ctx.fillRect(Math.round(cx - bw / 2 - 3), Math.round(by - 3), Math.round(bw + 6), Math.round(bh + 6));
      ctx.fillStyle = C.white; ctx.fillRect(Math.round(cx - bw / 2), Math.round(by), Math.round(bw), Math.round(bh));
      ctx.fillStyle = C.navy; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, cx, by + fs * 0.25 + lh * (i + 0.5)));
    }
    drawLabels(TAGS, sx, sy);
  }

  window.PhoneArena = {
    start(canvas) {
      if (cv === canvas && running) return;
      cv = canvas; ctx = cv.getContext('2d');
      resize(); addEventListener('resize', resize);
      running = true; last = performance.now(); requestAnimationFrame(frame);
    },
    update,
    onMyShot(fn) { onMyShot = fn; },
    setBubble(t) { S.bubble = t || ''; },
    retheme() { if (L) BG = buildBG(); },
    state: S
  };
})();

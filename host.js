/* Host screen: pixel-art arena, lobby, podium. Driven by STEPEngine messages. */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const C = PX.C;
  const LW = 600, LH = 338;
  const L = PX.cnv(LW, LH), lg = L.getContext('2d');
  lg.imageSmoothingEnabled = false;
  const cv = $('c'), ctx = cv.getContext('2d');
  const sfx = new STEPSfx();
  const LINES = { full: 'Welcome to STEP Onboarding, welcome teams!', short: 'Welcome!' };
  let LINE = LINES.full;

  /* ---------------------------------------------------------------- layout (low-res pixels) */
  const WALL = 66, FX0 = 58, FX1 = 542, FIN_Y = 100, START_Y = 324;
  const DOLL = { x: 300, y: 90 };
  const GUARDS = [{ x: 246, y: 90, shape: 'circle', mirror: false, kind: 'a' }, { x: 354, y: 90, shape: 'triangle', mirror: true, kind: 'b' }];
  GUARDS.forEach(g => { g.muzzle = g.mirror ? { x: g.x - 17, y: g.y - 10 } : { x: g.x + 17, y: g.y - 10 }; g.hand = { x: g.x + (g.mirror ? 1 : -1), y: g.y - 40 }; });
  // pirate edition (ALL ABOARD!): same field, a ship behind the dock instead of the wall
  const PIR = () => window.GAME_THEME === 'pirate';
  const SHIP = { cx: 300, hw: 212, deck: 47, keel: 75, top: 8, s: 1.1, dock: 78, planks: [150, 452] };
  let SHIPFG = null;
  const laneX = lane => Math.round(FX0 + 14 + lane * (FX1 - FX0 - 28));
  const progY = p => Math.round(START_Y - Math.max(0, Math.min(1.1, p)) * (START_Y - FIN_Y));

  /* ---------------------------------------------------------------- screen fit */
  let view = { s: 3, ox: 0, oy: 0, dpr: 1 };
  let vignette = null;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    let s = Math.min(cv.width / LW, cv.height / LH);
    if (s >= 2 && Math.floor(s) / s > 0.92) s = Math.floor(s);
    view = { s, ox: Math.round((cv.width - LW * s) / 2), oy: Math.round((cv.height - LH * s) / 2), dpr };
    vignette = PX.cnv(cv.width, cv.height);
    const v = vignette.getContext('2d');
    const gr = v.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.45, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.75);
    gr.addColorStop(0, 'rgba(8,10,25,0)'); gr.addColorStop(1, 'rgba(8,10,25,0.4)');
    v.fillStyle = gr; v.fillRect(0, 0, cv.width, cv.height);
    placeBubble();
  }
  addEventListener('resize', resize);
  const toScreen = (x, y) => ({ x: (view.ox + x * view.s) / view.dpr, y: (view.oy + y * view.s) / view.dpr });

  /* ---------------------------------------------------------------- crisp text (drawn at screen resolution) */
  const FONT = "'Jersey 15', system-ui, sans-serif";  // retro pixel font (drawn 1.23x so it reads like the old size)
  let LABELS = [];          // static signs built with the background
  const TAGS = [];          // per-frame labels
  // label: { t, x, y (low-res, centre/baseline), size (low-res px), col, weight, align, box, boxCol, out }
  function drawLabels(list, sx, sy) {
    ctx.textBaseline = 'middle';
    for (const L0 of list) {
      const fs = Math.max(12, Math.round(L0.size * 1.23 * view.s));
      ctx.font = `400 ${fs}px ${FONT}`;
      const X = view.ox + (L0.x + sx) * view.s, Y = view.oy + (L0.y + sy) * view.s;
      ctx.textAlign = L0.align || 'center';
      if (L0.box) {
        const w = ctx.measureText(L0.t).width, pad = fs * 0.35, h = fs * 1.25;
        const bx = L0.align === 'left' ? X - pad : X - w / 2 - pad;
        ctx.fillStyle = C.ink; ctx.fillRect(Math.round(bx - 2), Math.round(Y - h / 2 - 2), Math.round(w + pad * 2 + 4), Math.round(h + 4));
        ctx.fillStyle = L0.box; ctx.fillRect(Math.round(bx), Math.round(Y - h / 2), Math.round(w + pad * 2), Math.round(h));
        if (L0.pointer) { ctx.fillStyle = C.ink; ctx.fillRect(Math.round(X - view.s), Math.round(Y + h / 2), Math.round(view.s * 2), Math.round(view.s * 1.5)); }
      }
      if (L0.out) { ctx.lineWidth = Math.max(2, fs * 0.18); ctx.strokeStyle = L0.out; ctx.lineJoin = 'round'; ctx.strokeText(L0.t, X, Y); }
      ctx.fillStyle = L0.col || C.white;
      ctx.fillText(L0.t, X, Y);
    }
  }

  /* ---------------------------------------------------------------- assets */
  const IMG = {};
  const loadImg = (k, src) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; IMG[k] = i; });
  let TEAMS = [];
  let BG = null;
  Promise.all([
    loadImg('logoW', 'assets/step-logo-mark-white.png'), loadImg('mark', 'assets/step-logo-mark.png'),
    fetch('teams.json').then(r => r.json()).then(t => { TEAMS = t; return Promise.all([...new Set(t.map(x => x.crest))].map(c => loadImg('crest-' + c, 'assets/crests/' + c + '.png'))); }).catch(() => {})
  ]).then(() => { BG = buildBG(); });
  BG = buildBG();

  /* ---------------------------------------------------------------- background */
  function buildBG() {
    if (PIR()) return buildPirateBG();
    const c = PX.cnv(LW, LH), g = c.getContext('2d'), R = (x, y, w, h, col) => PX.R(g, x, y, w, h, col);
    const rnd = PX.rng(20261016);
    const ok = i => i && i.complete && i.naturalWidth > 0;
    const labels = [];
    // sky mural with dithered bands
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
    [[34, 22, 1], [240, 13, 1.2], [356, 30, 0.8], [572, 20, 1.1], [200, 46, 0.7], [470, 50, 0.8], [292, 52, 0.6]].forEach(([x, y, s]) => cloud(x, y, s));
    for (let x = 0; x < LW; x++) {
      const y = 3 + Math.round(Math.sin((x / LW) * Math.PI * 3) * 2 + 2); R(x, y, 1, 1, C.ink2);
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
    for (let i = 0; i < 34; i++) {
      const px = Math.floor(rnd() * LW), py = WALL + 10 + Math.floor(rnd() * (LH - WALL - 10)), rr = 4 + Math.floor(rnd() * 11);
      for (let y = -rr; y <= rr; y++) for (let x = -rr * 2; x <= rr * 2; x++) if ((x * x) / 4 + y * y < rr * rr && (x + y) % 2 === 0) R(px + x, py + y, 1, 1, C.sand5);
    }
    R(0, WALL, LW, 2, C.sand4); R(0, WALL + 2, LW, 1, C.sand5);
    if (ok(IMG.mark)) { g.globalAlpha = 0.5; g.drawImage(PX.pixelImage(IMG.mark, 210, 100, C.sand5), 300 - 105, 168); g.globalAlpha = 1; }
    // safe zone: painted green so it reads clearly
    g.fillStyle = 'rgba(60,196,106,0.42)'; g.fillRect(FX0, WALL + 3, FX1 - FX0, FIN_Y - WALL - 5);
    for (let x = FX0; x < FX1; x += 2) { R(x, WALL + 3, 1, 1, '#2f9e55'); R(x + 1, FIN_Y - 3, 1, 1, '#2f9e55'); }
    labels.push({ t: 'SAFE ZONE', x: FX0 + 44, y: 84, size: 8, col: '#e9ffe9', out: '#1d6b3a' }, { t: 'SAFE ZONE', x: FX1 - 44, y: 84, size: 8, col: '#e9ffe9', out: '#1d6b3a' });
    R(FX0, FIN_Y - 2, FX1 - FX0, 4, C.red); R(FX0, FIN_Y - 2, FX1 - FX0, 1, '#ff6a7e'); R(FX0, FIN_Y + 2, FX1 - FX0, 1, C.red2);
    for (let i = 0; i < 50; i++) R(FX0 + Math.floor(rnd() * (FX1 - FX0)), FIN_Y - 2 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 2), 1, rnd() < 0.5 ? C.sand : C.sand2);
    R(FX0, START_Y + 1, FX1 - FX0, 2, C.white); R(FX0, START_Y + 3, FX1 - FX0, 1, C.cream2);
    for (let i = 0; i < 36; i++) R(FX0 + Math.floor(rnd() * (FX1 - FX0)), START_Y + 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), 1, C.sand3);
    labels.push({ t: 'START', x: FX0 + 6, y: START_Y + 8.5, size: 6.5, col: C.sand4, align: 'left' });
    for (const q of [0.25, 0.5, 0.75]) { const y = progY(q); for (let x = FX0 + 2; x < FX1 - 2; x += 6) R(x, y, 3, 1, C.sand5); }
    // bare tree behind the doll
    const tx = 330, ty = 89;
    PX.ell(g, tx, ty + 1, 10, 2, 'rgba(20,16,34,.25)');
    for (let y = 22; y <= ty; y++) { const w = y > 78 ? 6 : y > 48 ? 5 : 4; R(tx - (w >> 1), y, w, 1, C.wood); R(tx - (w >> 1), y, 1, 1, C.wood3); R(tx + (w >> 1) - 1, y, 1, 1, C.wood2); }
    const br = [[tx, 58, tx + 18, 40], [tx + 12, 46, tx + 22, 42], [tx, 48, tx - 16, 32], [tx - 9, 40, tx - 14, 26], [tx, 36, tx + 12, 18], [tx + 6, 28, tx + 2, 14], [tx, 30, tx - 7, 16], [tx + 15, 42, tx + 26, 36]];
    for (const [a, b, c2, d] of br) { PX.line(g, a, b, c2, d, C.wood2); PX.line(g, a + 1, b, c2 + 1, d, C.wood); }
    for (let i = 0; i < 26; i++) { const lx = tx - 18 + Math.floor(rnd() * 46), ly = 14 + Math.floor(rnd() * 36); R(lx, ly, 2, 2, rnd() < 0.5 ? '#c78a3a' : '#e0a94c'); }
    PX.ell(g, DOLL.x, DOLL.y + 1, 19, 4, C.ink); PX.ell(g, DOLL.x, DOLL.y, 18, 3, C.navy3); PX.ell(g, DOLL.x, DOLL.y - 1, 16, 2, C.navy); R(DOLL.x - 18, DOLL.y, 37, 1, C.gold);
    // side walls with team banners
    for (const side of [0, 1]) {
      const x0 = side ? FX1 : 0, w = side ? LW - FX1 : FX0;
      R(x0, WALL, w, LH - WALL, C.cream);
      for (let x = x0 + 3; x < x0 + w; x += 7) R(x, WALL, 1, LH - WALL, C.cream2);
      for (let y = WALL + 9; y < LH; y += 23) R(x0, y, w, 1, C.cream2);
      R(side ? FX1 : FX0 - 1, WALL, 1, LH - WALL, C.ink);
      R(side ? FX1 + 1 : FX0 - 3, WALL, 2, LH - WALL, C.cream3);
      g.fillStyle = 'rgba(120,80,30,0.25)'; g.fillRect(side ? FX1 - 3 : FX0, WALL, 3, LH - WALL);
      R(x0, WALL, w, 2, C.cream3);
    }
    drawBanners(g, labels, WALL);
    LABELS = labels;
    return c;
  }
  // team banners on the side walls (from y = top down)
  function drawBanners(g, labels, top) {
    const R = (x, y, w, h, col) => PX.R(g, x, y, w, h, col);
    const ok = i => i && i.complete && i.naturalWidth > 0;
    const per = Math.max(1, Math.ceil(TEAMS.length / 2));
    const gap = Math.floor((LH - top - 8) / per);
    TEAMS.forEach((tm, i) => {
      const side = i % 2, row = Math.floor(i / 2);
      const bw2 = 50, bh2 = gap - 6, x = side ? FX1 + 4 : 4, y = top + 8 + row * gap;
      R(x - 2, y - 1, bw2 + 4, 1, C.wood2); R(x - 2, y - 2, bw2 + 4, 1, C.wood3);
      for (let yy = 0; yy < bh2; yy++) {
        const notch = yy > bh2 - 7 ? (yy - (bh2 - 7)) * 2 : 0;
        R(x, y + yy, bw2, 1, C.navy);
        if (notch) R(x + (bw2 >> 1) - notch, y + yy, notch * 2, 1, C.cream);
      }
      R(x, y, bw2, 3, C.gold); R(x, y, bw2, 1, C.gold3); R(x, y, 1, bh2 - 7, C.navy3); R(x + bw2 - 1, y, 1, bh2 - 7, C.navy2);
      const crest = IMG['crest-' + tm.crest];
      if (ok(crest)) g.drawImage(PX.pixelImage(crest, 22, 22, C.white), x + 14, y + 5);
      const name = String(tm.team);
      const long = name.length > 9 && name.includes(' ');
      if (long) { const [a, ...b] = name.split(' '); labels.push({ t: a.toUpperCase(), x: x + bw2 / 2, y: y + 32, size: 6, col: C.gold3 }, { t: b.join(' ').toUpperCase(), x: x + bw2 / 2, y: y + 38.5, size: 6, col: C.gold3 }); }
      else labels.push({ t: name.toUpperCase(), x: x + bw2 / 2, y: y + 34, size: name.length > 7 ? 6.5 : 7.5, col: C.gold3 });
    });
  }

  /* ---------------------------------------------------------------- pirate background: sea, ship, dock, beach */
  function buildPirateBG() {
    const c = PX.cnv(LW, LH), g = c.getContext('2d'), R = (x, y, w, h, col) => PX.R(g, x, y, w, h, col);
    const rnd = PX.rng(20261019);
    const ok = i => i && i.complete && i.naturalWidth > 0;
    const K = PXP.K, labels = [];
    const HZ = 34;
    // sky + clouds + gulls
    const bands = [[0, C.sky1], [10, C.sky2], [20, C.sky3], [28, C.sky4]];
    bands.forEach(([y0, col], i) => {
      const y1 = i + 1 < bands.length ? bands[i + 1][0] : HZ;
      R(0, y0, LW, y1 - y0, col);
      if (i + 1 < bands.length) for (let x = 0; x < LW; x++) { if (x % 2 === 0) R(x, y1 - 1, 1, 1, bands[i + 1][1]); if (x % 2 === 1) R(x, y1, 1, 1, col); }
    });
    const cloud = (cx, cy, s) => {
      const parts = [[0, 0, 7], [-9, 2, 5], [9, 2, 6], [-4, -3, 5], [5, -4, 5], [15, 4, 4], [-15, 4, 3]];
      for (const [dx, dy, r] of parts) PX.disc(g, Math.round(cx + dx * s), Math.round(cy + dy * s), Math.round(r * s), C.cloud2);
      for (const [dx, dy, r] of parts) PX.disc(g, Math.round(cx + dx * s), Math.round(cy + dy * s) - 1, Math.max(1, Math.round(r * s) - 1), C.cloud);
    };
    [[34, 14, 1], [560, 12, 1.1], [80, 26, 0.6], [520, 27, 0.7]].forEach(([x, y, s]) => cloud(x, y, s));
    [[60, 8], [70, 12], [540, 30], [552, 26], [24, 30]].forEach(([x, y]) => PXP.gull(g, x, y));
    // sea, a little island, the ship
    PXP.sea(g, LW, HZ, SHIP.dock, rnd);
    PXP.island(g, 40, HZ + 2, 16);
    PXP.ship(g, Object.assign({ logo: ok(IMG.mark) ? IMG.mark : null }, SHIP));
    for (let x = 0; x < LW; x++) if (rnd() < 0.5) R(x, SHIP.keel - 1 + Math.floor(rnd() * 3), 1, 1, K.foam);
    SHIPFG = PXP.bulwark(LW, LH, SHIP);
    // beach sand
    R(0, FIN_Y, LW, LH - FIN_Y, C.sand);
    for (let y = FIN_Y; y < LH; y++) for (let x = 0; x < LW; x++) {
      const r = rnd();
      if (r < 0.05) R(x, y, 1, 1, C.sand2); else if (r < 0.085) R(x, y, 1, 1, C.sand3); else if (r < 0.089) { R(x, y, 1, 1, C.sand4); R(x, y - 1, 1, 1, C.sand3); }
    }
    for (let i = 0; i < 30; i++) {
      const px = Math.floor(rnd() * LW), py = FIN_Y + 10 + Math.floor(rnd() * (LH - FIN_Y - 10)), rr = 4 + Math.floor(rnd() * 11);
      for (let y = -rr; y <= rr; y++) for (let x = -rr * 2; x <= rr * 2; x++) if ((x * x) / 4 + y * y < rr * rr && (x + y) % 2 === 0) R(px + x, py + y, 1, 1, C.sand5);
    }
    for (let i = 0; i < 18; i++) PXP.shell(g, FX0 + 6 + Math.floor(rnd() * (FX1 - FX0 - 12)), FIN_Y + 12 + Math.floor(rnd() * (START_Y - FIN_Y - 20)), rnd);
    if (ok(IMG.mark)) { g.globalAlpha = 0.5; g.drawImage(PX.pixelImage(IMG.mark, 210, 100, C.sand5), 300 - 105, 168); g.globalAlpha = 1; }
    // the dock in front of the ship = the safe zone; its edge is the line to cross
    PXP.dock(g, 0, LW, SHIP.dock, FIN_Y);
    labels.push({ t: 'SAFE ZONE', x: FX0 + 44, y: 87, size: 8, col: '#e9ffe9', out: '#1d6b3a' }, { t: 'SAFE ZONE', x: FX1 - 44, y: 87, size: 8, col: '#e9ffe9', out: '#1d6b3a' });
    PXP.dockEdge(g, FX0, FX1, FIN_Y, 54);
    R(FX0, START_Y + 1, FX1 - FX0, 2, C.white); R(FX0, START_Y + 3, FX1 - FX0, 1, C.cream2);
    for (let i = 0; i < 36; i++) R(FX0 + Math.floor(rnd() * (FX1 - FX0)), START_Y + 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), 1, C.sand3);
    labels.push({ t: 'START', x: FX0 + 6, y: START_Y + 8.5, size: 6.5, col: C.sand4, align: 'left' });
    for (const q of [0.25, 0.5, 0.75]) { const y = progY(q); for (let x = FX0 + 2; x < FX1 - 2; x += 6) R(x, y, 3, 1, C.sand5); }
    // barrel stacks beside the crew, and the captain's shadow
    for (const gd of GUARDS) {
      const bx = gd.mirror ? gd.x + 24 : gd.x - 24;
      PX.ell(g, bx, gd.y + 1, 11, 2, 'rgba(20,16,34,.25)');
      g.drawImage(PXP.barrel(false), bx - 11, gd.y - 10); g.drawImage(PXP.barrel(false), bx - 1, gd.y - 10); g.drawImage(PXP.barrel(false), bx - 6, gd.y - 19);
    }
    PX.ell(g, DOLL.x, DOLL.y + 1, 18, 3, 'rgba(20,16,34,.3)');
    // side walls: a wooden palisade with the team banners
    for (const side of [0, 1]) {
      const x0 = side ? FX1 : 0, w = side ? LW - FX1 : FX0, top = SHIP.dock + 2;
      for (let x = x0; x < x0 + w; x++) {
        const col = (x - x0) % 6 === 0 ? K.hull2 : (x - x0) % 6 === 1 ? K.plank3 : K.plank;
        const tip = Math.abs(((x - x0) % 6) - 2.5) | 0;
        R(x, top + tip, 1, LH - top - tip, col);
      }
      for (let y = top + 18; y < LH; y += 40) R(x0, y, w, 2, K.hull2);
      R(side ? FX1 : FX0 - 1, top, 1, LH - top, C.ink);
    }
    drawBanners(g, labels, SHIP.dock + 2);
    LABELS = labels;
    return c;
  }

  /* ---------------------------------------------------------------- state */
  const S = {
    phase: 'lobby', phaseAt: 0, phaseMs: 0, players: new Map(), winnersCount: 3, maxPlayers: 25,
    turnFrom: 'front', turnTo: 'front', turnT0: 0, turnMs: 1, speakT0: 0,
    shake: 0, flash: 0, lastShot: 0, nextTick: 0, tickHigh: false, timeLeft: null, podium: null, deckN: [0, 0]
  };
  function rec(p) {
    let r = S.players.get(p.id);
    if (!r) { r = { id: p.id, dpos: p.pos / 100, anim: Math.random() * 4, lastStepIdx: 0, shotAt: 0 }; S.players.set(p.id, r); }
    if (r.num !== p.num || r.gender !== p.gender || !r.look) { r.look = PX.look('p' + p.num, p.gender); r.gender = p.gender; }
    Object.assign(r, { num: p.num, name: p.name, pos: p.pos, status: p.status, rank: p.rank, pressing: p.pressing, moving: p.moving, team: p.team, connected: p.connected, bot: p.bot, local: p.local, lane: p.lane });
    return r;
  }
  let ENGINE = null;
  const send = m => { if (ENGINE) ENGINE.command(m); };

  function onMsg(m) {
    switch (m.t) {
      case 'state': onState(m); break;
      case 'phase': onPhase(m); break;
      case 'eliminated': onEliminated(m); break;
      case 'won': onWon(m); break;
    }
  }
  function onState(m) {
    const ids = new Set();
    for (const p of m.players) { rec(p); ids.add(p.id); }
    for (const id of [...S.players.keys()]) if (!ids.has(id)) S.players.delete(id);
    S.timeLeft = m.timeLeft;
    updateHud();
    if (S.phase === 'lobby' || S.phase === 'ended') updateRoster();
  }
  function onPhase(m) {
    const prev = S.phase;
    S.phase = m.phase; S.phaseAt = performance.now(); S.phaseMs = m.ms;
    if (m.phase === 'lobby' || m.phase === 'countdown') S.deckN = [0, 0];
    const lobby = m.phase === 'lobby', ended = m.phase === 'ended';
    $('lobby').classList.toggle('show', lobby);
    $('podium').classList.toggle('show', ended);
    $('hud').hidden = lobby || ended;
    $('feed').hidden = lobby || ended;
    $('endBtn').hidden = lobby || ended;
    setPhasePill();
    switch (m.phase) {
      case 'lobby': S.podium = null; turn('front', 1); stopSpeech(); $('feed').textContent = ''; updateRoster(); break;
      case 'countdown': S.final = false; runCountdown(m.ms); turn('back', 500); stopSpeech(); $('feed').textContent = ''; break;
      case 'green':
        if (prev !== 'turnback') turn('back', 400);
        if (prev === 'countdown') { sfx.horn(); showCount('GO!'); }
        LINE = LINES[m.line] || LINES.full;
        speak(m.ms);
        break;
      case 'turning': turn('front', m.ms); stopSpeech(); sfx.turnCue(m.ms); break;
      case 'red': turn('front', 1); S.scanAt = performance.now(); break;
      case 'turnback': turn('back', m.ms); break;
      case 'ended': turn('front', 500); stopSpeech(); showPodium(m); break;
    }
    placeBubble();
    requestAnimationFrame(fitUI);
  }
  function setPhasePill() {
    const el = $('phase');
    const map = { countdown: ['GET READY', 'count'], green: ['GREEN LIGHT · RUN!', 'green'], turning: ['SHE’S TURNING…', 'turning'], red: ['RED LIGHT · FREEZE!', 'red'], turnback: ['RED LIGHT · FREEZE!', 'red'] };
    el.hidden = true;   // no light indicator: players must watch the doll
  }
  function onEliminated(m) {
    const r = S.players.get(m.id); if (!r) return;
    r.status = 'out';
    const t = performance.now();
    // caught: they panic and try to run for 1-2 seconds, guards miss a couple of times, then hit
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
    if (PIR()) { throwBarrels(r, m, t); return; }
    const misses = 1 + Math.floor(Math.random() * 2);
    r.shots = [];
    for (let i = misses; i >= 1; i--) r.shots.push({ at: r.shotAt - i * (180 + Math.random() * 120), miss: true, dx: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 8), dy: Math.random() * 6 - 3 });
    r.shots.push({ at: r.shotAt, miss: false }, { at: r.shotAt + 110, miss: false });
    // panicked shout(s) while running — one per caught player, voice by gender, kept quiet
    S.shouting = (S.shouting || 0) + 1;
    const vol = Math.max(0.5, 1 / Math.sqrt(S.shouting));
    setTimeout(() => sfx.shout(r.gender, vol), 60 + Math.random() * 260);
    if (Math.random() < 0.5) setTimeout(() => sfx.shout(r.gender, vol * 0.8), r.fleeMs * 0.5 + Math.random() * 200);
    setTimeout(() => { S.shouting = Math.max(0, S.shouting - 1); }, r.fleeMs);
    for (const sh of r.shots) setTimeout(() => { sfx.gunshot(); S.shake = sh.miss ? 1.5 : 3; if (!sh.miss) S.flash = 0.22; }, Math.max(0, sh.at - t));
    setTimeout(() => sfx.hitCry(r.gender, vol), Math.max(0, r.shotAt - t) + 40);
    if (m.reason === 'unsafe') { if (!S.final) { S.final = true; turn('front', 250); stopSpeech(); } }
    setTimeout(() => feed(`#${pad(m.num)} ${m.name} — ${m.reason === 'time' ? 'out of time' : m.reason === 'unsafe' ? 'left in the unsafe zone' : 'eliminated'}`, false), r.shotAt - t);
  }
  // pirate edition: the crew throw barrels instead of shooting — 1-2 misses, then a hit that leaves the player dizzy
  function throwBarrels(r, m, t) {
    const misses = 1 + Math.floor(Math.random() * 2);
    r.shots = [];
    for (let i = misses; i >= 1; i--) r.shots.push({ at: r.shotAt - i * (300 + Math.random() * 90), miss: true, fl: 380, dx: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8), dy: Math.random() * 8 - 2 });
    r.shots.push({ at: r.shotAt, miss: false, fl: 420 });
    for (const sh of r.shots) {
      const p = fleePos(r, Math.min(1, (sh.at - r.fleeAt) / r.fleeMs));
      sh.tx = Math.round(p.x + (sh.miss ? sh.dx : 0)); sh.ty = Math.round(p.y + (sh.miss ? sh.dy : -11));
      sh.arc = 16 + Math.hypot(sh.tx - r.guard.hand.x, sh.ty - r.guard.hand.y) * 0.18;
    }
    S.shouting = (S.shouting || 0) + 1;
    const vol = Math.max(0.5, 1 / Math.sqrt(S.shouting));
    setTimeout(() => sfx.shout(r.gender, vol), 60 + Math.random() * 260);
    setTimeout(() => { S.shouting = Math.max(0, S.shouting - 1); }, r.fleeMs);
    for (const sh of r.shots) {
      setTimeout(() => sfx.whoosh(), Math.max(0, sh.at - sh.fl - t));
      setTimeout(() => {
        sfx.crash(sh.miss ? 0.7 : 1); S.shake = sh.miss ? 1.2 : 2.5;
        splinters(sh.tx, sh.ty + (sh.miss ? 2 : 0), sh.miss ? 10 : 16);
        if (!sh.miss) { S.flash = 0.15; sfx.bonk(); setTimeout(() => sfx.hitCry(r.gender, vol), 60); setTimeout(() => sfx.dizzy(), 420); }
      }, Math.max(0, sh.at - t));
    }
    if (m.reason === 'unsafe') { if (!S.final) { S.final = true; turn('front', 250); stopSpeech(); } }
    setTimeout(() => feed(`#${pad(m.num)} ${m.name} — ${m.reason === 'time' ? 'out of time' : m.reason === 'unsafe' ? 'left in the unsafe zone' : 'eliminated'}`, false), r.shotAt - t);
  }
  function onWon(m) {
    const r = S.players.get(m.id); if (!r) return;
    r.status = 'won'; r.rank = m.rank;
    sfx.ding(); sfx.cheer(false);
    burst(laneX(r.lane), FIN_Y - 6, 70);
    feed(`#${pad(m.num)} ${m.name} — ${PIR() ? 'ABOARD!' : 'SAFE!'} ${ord(m.rank)} place`, true);
  }
  const pad = n => String(n).padStart(3, '0');
  const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  function feed(txt, win) {
    const d = document.createElement('div'); d.className = 'fi' + (win ? ' win' : ''); d.textContent = txt;
    const f = $('feed'); f.prepend(d); while (f.children.length > 6) f.lastChild.remove();
    setTimeout(() => d.remove(), 6200);
  }

  /* ---------------------------------------------------------------- HUD + lobby DOM */
  function updateHud() {
    let alive = 0, safe = 0, out = 0;
    for (const r of S.players.values()) { if (r.status === 'alive') alive++; else if (r.status === 'won') safe++; else if (r.status === 'out') out++; }
    $('sAlive').textContent = alive; $('sSafe').textContent = safe + '/' + S.winnersCount; $('sOut').textContent = out;
    const tEl = $('timer');
    if (S.timeLeft != null && !['lobby', 'ended', 'countdown'].includes(S.phase)) { tEl.hidden = false; const s = Math.ceil(S.timeLeft / 1000); tEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    else tEl.hidden = true;
  }
  function spriteCanvas(lk, view, frame, scale) {
    const s = PX.charSprite(lk, view, frame), c = document.createElement('canvas');
    c.width = 14; c.height = s.height; c.getContext('2d').drawImage(s, Math.floor((14 - s.width) / 2), 0);
    c.style.width = 14 * scale + 'px'; c.style.height = s.height * scale + 'px'; c.className = 'sprite';
    return c;
  }
  let rosterSig = '';
  function updateRoster() {
    const list = [...S.players.values()].sort((a, b) => a.num - b.num);
    $('pcount').textContent = list.length + '/' + S.maxPlayers;
    $('startBtn').disabled = list.filter(r => r.connected || r.bot).length === 0;
    const bots = list.filter(r => r.bot).length;
    $('nobotBtn').hidden = !bots;
    $('botBtn').disabled = list.length >= S.maxPlayers;
    const sig = list.map(r => r.id + r.name + r.connected + r.num + r.gender + r.team).join('|');
    if (sig === rosterSig) return;
    rosterSig = sig;
    const box = $('roster'); box.textContent = '';
    if (!list.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Waiting for players to scan the QR code…'; box.appendChild(e); return; }
    for (const r of list) {
      const c = document.createElement('div'); c.className = 'chip' + (!r.connected && !r.bot ? ' off' : '');
      const av = document.createElement('div'); av.className = 'av'; av.appendChild(spriteCanvas(r.look, 'front', 'idle', 3)); c.appendChild(av);
      const t = document.createElement('div'); t.className = 'ct';
      const n = document.createElement('div'); n.className = 'n'; n.textContent = 'NO.' + pad(r.num);
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = r.name;
      t.append(n, nm);
      if (r.team) { const tm = document.createElement('div'); tm.className = 'tm'; tm.textContent = r.team; t.appendChild(tm); }
      if (r.bot || r.local) { const b = document.createElement('span'); b.className = 'tag'; b.textContent = r.bot ? 'BOT' : 'YOU'; n.appendChild(b); }
      c.appendChild(t);
      const x = document.createElement('button'); x.className = 'x'; x.title = 'Remove player'; x.textContent = '×'; x.onclick = () => send({ t: 'kick', id: r.id });
      c.appendChild(x);
      box.appendChild(c);
    }
    fitUI();
  }
  // game mode: EASY = runners stop the instant FORWARD is released; HARD = they slide a moment after (let go early)
  let MODE = 'hard'; try { MODE = localStorage.getItem('step-rlgl-mode-diff') === 'easy' ? 'easy' : 'hard'; } catch {}
  function setMode(m) {
    MODE = m; try { localStorage.setItem('step-rlgl-mode-diff', m); } catch {}
    $('modeEasy').classList.toggle('on', m === 'easy'); $('modeHard').classList.toggle('on', m === 'hard');
    $('modeEasy').setAttribute('aria-pressed', m === 'easy'); $('modeHard').setAttribute('aria-pressed', m === 'hard');
    $('modeDesc').textContent = m === 'easy' ? 'Runners stop the instant you let go.' : 'Runners slide a moment after you let go. Let go early!';
    send({ t: 'mode', mode: m });
  }
  $('modeEasy').onclick = () => setMode('easy');
  $('modeHard').onclick = () => setMode('hard');
  $('startBtn').onclick = () => { sfx.unlock(); primeSpeech(); send({ t: 'start' }); };
  $('botBtn').onclick = () => send({ t: 'addBots', n: 5 });
  $('nobotBtn').onclick = () => send({ t: 'removeBots' });
  $('againBtn').onclick = () => send({ t: 'lobby' });
  $('endBtn').onclick = () => { const b = $('endBtn'); if (b.dataset.armed) { delete b.dataset.armed; b.textContent = 'END ROUND'; send({ t: 'end' }); return; } b.dataset.armed = 1; b.textContent = 'CLICK AGAIN'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'END ROUND'; }, 2500); };
  // volume for this screen only (saved on this device)
  let VOL = 0.8; try { const v = parseFloat(localStorage.getItem('step-rlgl-volume')); if (v >= 0 && v <= 1) VOL = v; } catch {}
  $('volume').value = Math.round(VOL * 100);
  const applyVol = () => { sfx.setVolume(VOL); for (const set of [VOICE, VOICEP]) for (const k in set) set[k].el.volume = Math.min(1, VOL * 1.15); };
  $('volume').addEventListener('input', e => { VOL = e.target.value / 100; try { localStorage.setItem('step-rlgl-volume', String(VOL)); } catch {} sfx.unlock(); applyVol(); });
  setTimeout(applyVol, 0);
  $('muteBtn').onclick = () => { sfx.unlock(); sfx.setMuted(!sfx.muted); $('muteBtn').textContent = sfx.muted ? 'SOUND: OFF' : 'SOUND: ON'; };
  $('fsBtn').onclick = toggleFs;
  function toggleFs() { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); } catch {} }
  addEventListener('pointerdown', () => { if ($('hostApp').hidden) return; sfx.unlock(); primeSpeech(); $('soundHint').hidden = true; });
  addEventListener('keydown', e => {
    if ($('hostApp').hidden || document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'f' || e.key === 'F') toggleFs();
    if (e.key === 'm' || e.key === 'M') $('muteBtn').click();
    if (e.key === 'Enter' && S.phase === 'lobby' && !$('startBtn').disabled) $('startBtn').click();
  });

  function drawQr(text) {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), c = $('qr'); c.width = c.height = n + 4;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, n + 4, n + 4); g.fillStyle = C.navy2;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(k + 2, r + 2, 1, 1);
    $('url').textContent = text.replace(/^https?:\/\//, '');
  }

  function showCount(txt) { const c = $('count'); c.hidden = false; c.textContent = ''; const s = document.createElement('span'); s.textContent = txt; c.appendChild(s); }
  function runCountdown(ms) {
    const secs = Math.round(ms / 1000);
    for (let i = 0; i < secs; i++) setTimeout(() => { showCount(secs - i); sfx.beep(660, 0.18); }, i * 1000);
    setTimeout(() => setTimeout(() => { $('count').hidden = true; }, 900), ms);
  }

  function showPodium(m) {
    S.podium = m.podium || [];
    const n = S.winnersCount, order = n >= 3 ? [2, 1, 3] : n === 2 ? [2, 1] : [1];
    const stage = $('stage'); stage.textContent = '';
    for (const rank of order) {
      const w = S.podium.find(p => p.rank === rank);
      const d = document.createElement('div'); d.className = 'spot p' + Math.min(rank, 3) + (w ? '' : ' none');
      const fig = document.createElement('div'); fig.className = 'fig';
      const sc = spriteCanvas(PX.look(w ? 'p' + w.num : 'none', w && w.gender), 'front', w ? 'cheer' : 'idle', 7);
      fig.appendChild(sc);
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = w ? w.name : '—';
      const nb = document.createElement('div'); nb.className = 'nb'; nb.textContent = w ? (w.team ? w.team.toUpperCase() + ' · ' : '') + 'PLAYER ' + pad(w.num) : 'NO ONE';
      const bl = document.createElement('div'); bl.className = 'block'; bl.textContent = rank;
      d.append(fig, nm, nb, bl); stage.appendChild(d);
      if (w) {
        let f = 0;
        const iv = setInterval(() => {
          if (!document.body.contains(sc)) return clearInterval(iv);
          f ^= 1; const s = PX.charSprite(PX.look('p' + w.num, w.gender), 'front', f ? 'cheer2' : 'cheer'); const g = sc.getContext('2d');
          g.clearRect(0, 0, sc.width, sc.height); g.drawImage(s, Math.floor((14 - s.width) / 2), 0);
        }, 260);
      }
    }
    const total = m.total || 0, out = m.outCount || 0;
    if (PIR()) $('podSub').textContent = S.podium.length ? `${S.podium.length} made it aboard the ship · ${out} of ${total} eliminated` : `Nobody made it aboard · ${out} of ${total} eliminated`;
    else $('podSub').textContent = S.podium.length ? `${S.podium.length} crossed the safe line · ${out} of ${total} eliminated` : `Nobody crossed the safe line · ${out} of ${total} eliminated`;
    if (S.podium.length) { setTimeout(() => { sfx.fanfare(); sfx.cheer(true); }, 300); for (let i = 0; i < 5; i++) setTimeout(() => burst(60 + Math.random() * 360, 40 + Math.random() * 60, 90), 200 + i * 400); }
  }

  /* ---------------------------------------------------------------- speech + bubble */
  let voice = null, speechPrimed = false;
  function pickVoice() {
    const vs = speechSynthesis.getVoices(); if (!vs.length) return;
    for (const p of ['Samantha', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Zira', 'Karen', 'Moira', 'Tessa', 'Victoria', 'Google US English']) { const v = vs.find(v => v.name.includes(p)); if (v) { voice = v; return; } }
    voice = vs.find(v => /^en/i.test(v.lang)) || vs[0];
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function primeSpeech() { if (speechPrimed) return; speechPrimed = true; for (const set of [VOICE, VOICEP]) for (const k in set) { const a = set[k].el; a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; }); } }
  /* The doll's voice is a recording made by the STEP team (assets/voice). The browser's own voice is only a backup.
     marks = when each word starts in the recording (seconds), so the bubble shows each word as she says it. */
  let spk = { t0: 0, dur: 1, idx: 0, started: true, boundary: false, done: false };
  let utterances = [];
  const VOICE = {
    full: { src: 'assets/voice/doll-full.mp3', marks: [0.04, 0.74, 0.98, 1.18, 2.28, 2.80], len: 3.5 },
    short: { src: 'assets/voice/doll-short.mp3', marks: [0], len: 0.68 }
  };
  // the captain (pirate edition): the same recording, pitched down to a deep pirate voice — same words and timing
  const VOICEP = {
    full: { src: 'assets/voice/pirate-full.mp3', marks: VOICE.full.marks, len: VOICE.full.len },
    short: { src: 'assets/voice/pirate-short.mp3', marks: [0], len: 0.66 }
  };
  for (const set of [VOICE, VOICEP]) for (const k in set) { const a = new Audio(set[k].src); a.preload = 'auto'; a.preservesPitch = true; a.webkitPreservesPitch = true; set[k].el = a; }
  let voiceTimer = 0, playing = null;
  // play(), retrying once if a previous play/pause interrupted it
  const playEl = a => a.play().catch(e => e && e.name === 'AbortError' ? new Promise(r => setTimeout(r, 150)).then(() => { a.muted = false; return a.play(); }) : Promise.reject(e));
  function speak(ms) {
    S.speakT0 = performance.now();
    const VS = PIR() ? VOICEP : VOICE;
    const v = LINE === LINES.short ? VS.short : VS.full;
    const me = spk = { t0: S.speakT0, dur: Math.max(300, ms - 150), idx: 0, started: true, boundary: false, done: false };
    stopSpeech();
    if (sfx.muted) return;
    // fit the line into the green light: faster if time is short, otherwise start a little later
    // so she says her last word just before she turns
    const avail = Math.max(0.4, (ms - 200) / 1000);
    const rate = Math.max(1, Math.min(2.2, v.len / avail));
    const delay = Math.max(0, Math.min(1.5, avail - v.len / rate - 0.05));
    me.started = false; me.t0 = S.speakT0 + delay * 1000; me.dur = v.len / rate * 1000;
    voiceTimer = setTimeout(() => {
      if (spk !== me) return;
      const a = v.el; playing = a;
      try { a.pause(); a.currentTime = 0; } catch {}
      a.playbackRate = rate;
      a.muted = false;
      playEl(a).then(() => {
        if (spk !== me) return;
        me.started = true; me.t0 = performance.now(); me.boundary = true; me.idx = 1;
        v.marks.forEach((m, i) => { if (i) setTimeout(() => { if (spk === me) me.idx = i + 1; }, m / rate * 1000); });
      }).catch(() => { if (spk === me) speakTTS(ms - delay * 1000, me); });
    }, delay * 1000);
  }
  // backup only: the browser's built-in voice
  function speakTTS(ms, me) {
    if (!('speechSynthesis' in window)) { me.started = true; return; }
    try {
      const ss = speechSynthesis; if (ss.speaking || ss.pending) ss.cancel();
      const u = new SpeechSynthesisUtterance(LINE); if (voice) u.voice = voice; u.pitch = PIR() ? 0.5 : 1.65;
      u.rate = Math.max(0.6, Math.min(2, (LINE === LINES.short ? 0.75 : 2.7) / Math.max(0.3, ms / 1000)));
      u.onstart = () => { if (spk === me) { me.started = true; me.t0 = performance.now(); } };
      utterances = [u]; ss.speak(u);
      setTimeout(() => { if (spk === me && !me.started && S.phase === 'green') voiceWarn(false); }, 1400);
    } catch { me.started = true; }
  }
  let warnTimer = 0;
  function voiceWarn(ok) {
    const w = $('voiceWarn'); clearTimeout(warnTimer);
    w.className = ok ? 'ok' : '';
    const who = PIR() ? 'The captain' : 'The doll';
    w.textContent = ok ? who + '\u2019s voice is working.' : who + '\u2019s voice could not play. Click anywhere on the page once, check that SOUND is ON and the computer volume is up, then try again.';
    w.hidden = false; warnTimer = setTimeout(() => { w.hidden = true; }, ok ? 2500 : 12000);
  }
  function stopSpeech() { clearTimeout(voiceTimer); if (playing) { try { playing.pause(); } catch {} } try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); } catch {} }
  function placeBubble() {
    const b = $('bubble'); if (!b) return;
    const p = PIR() ? toScreen(DOLL.x + 30, DOLL.y - 70) : toScreen(DOLL.x + 26, DOLL.y - 66);
    b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
  }
  function updateBubble(now) {
    const b = $('bubble');
    const on = !S.final && S.phase === 'green' || (S.phase === 'turning' && now - S.phaseAt < 200);
    if (!on) { if (!b.hidden) b.hidden = true; return; }
    const words = LINE.split(' ');
    // voice did not start within 0.7 s (blocked or slow): fall back to the green-light timing
    if (!spk.started && now - spk.t0 > 700) { spk.started = true; spk.t0 = S.phaseAt; spk.dur = Math.max(300, S.phaseMs - 150); }
    if (!spk.started && S.phase === 'green') { if (!b.hidden) b.hidden = true; return; }
    let shown;
    if (S.phase !== 'green' || spk.done) shown = words.length;
    else if (spk.boundary) shown = spk.idx;
    else shown = Math.ceil((now - spk.t0) / spk.dur * words.length);
    shown = Math.max(1, Math.min(words.length, shown));
    const txt = words.slice(0, shown).join(' ');
    if (b.hidden) b.hidden = false;
    if (b.dataset.t !== txt) { b.dataset.t = txt; b.querySelector('span').textContent = txt; }
  }

  /* ---------------------------------------------------------------- doll turning */
  function dollView(now) {
    const k = Math.min(1, (now - S.turnT0) / S.turnMs);
    if (S.turnFrom === S.turnTo || k >= 1) return S.turnTo;
    if (k < 0.4) return S.turnFrom;
    if (k < 0.75) return 'side';
    return S.turnTo;
  }
  function turn(to, ms) { S.turnFrom = dollView(performance.now()); S.turnTo = to; S.turnT0 = performance.now(); S.turnMs = Math.max(1, ms); }

  /* ---------------------------------------------------------------- particles (pooled) */
  const POOL = Array.from({ length: 500 }, () => ({ on: false }));
  const CONF = [C.gold, C.gold3, C.blue3, C.jacket, C.white, C.red, C.green];
  function spawn(o) { for (const p of POOL) if (!p.on) { Object.assign(p, o); p.on = true; return p; } return null; }
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 110; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, g: 160, life: 1.6 + Math.random() * 1.4, col: CONF[(Math.random() * CONF.length) | 0], w: Math.random() < 0.5 ? 2 : 1, h: 1, kind: 'conf' }); }
  }
  function dust(x, y) { for (let i = 0; i < 2; i++) spawn({ x: x + (Math.random() * 6 - 3), y: y - 1, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 8, g: 30, life: 0.35 + Math.random() * 0.25, col: Math.random() < 0.5 ? C.sand3 : C.cream2, w: 1, h: 1, kind: 'dust' }); }
  function splinters(x, y, n) {
    const cols = [PXP.K.plank, PXP.K.plank2, PXP.K.plank3, PXP.K.plank4, C.steel];
    for (let i = 0; i < n; i++) { const a = -Math.PI * Math.random(), v = 30 + Math.random() * 70; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 220, life: 0.5 + Math.random() * 0.5, col: cols[(Math.random() * cols.length) | 0], w: 2, h: 1, kind: 'conf' }); }
    for (let i = 0; i < 4; i++) dust(x, y + 2);
  }
  function sparkle(x, y) { spawn({ x: x + (Math.random() * 16 - 8), y: y - 6 - Math.random() * 18, vx: 0, vy: -10, g: 0, life: 0.5, col: Math.random() < 0.5 ? C.gold3 : C.white, w: 1, h: 1, kind: 'spark' }); }
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

  /* ---------------------------------------------------------------- red light beam (dithered) */
  // Red light: a dithered red beam from the doll's eyes sweeps across the field (same look as the phones)
  function drawBeam(t) {
    if (!(S.phase === 'red' || S.phase === 'turnback') || S.final) return;
    const ex = DOLL.x, ey = DOLL.y - 52;
    const cx = DOLL.x + Math.sin(t * 1.5) * 190, hw = 46, ty = 290;
    lg.fillStyle = 'rgba(255,40,70,0.30)';
    for (let y = ey + 6; y < ty; y++) {
      const k = (y - ey) / (ty - ey), mid = ex + (cx - ex) * k, w = 2 + hw * k;
      for (let x = Math.round(mid - w); x <= Math.round(mid + w); x++) if ((x + y) % 2 === 0) lg.fillRect(x, y, 1, 1);
    }
  }

  // pirate edition: the captain sweeps the beach with his spyglass (same dithered red beam as the doll)
  function drawBeamPirate(t) {
    if (!(S.phase === 'red' || S.phase === 'turnback') || S.final) return;
    const ex = DOLL.x - 5, ey = DOLL.y - 52;
    const cx = DOLL.x + Math.sin(t * 1.5) * 190, hw = 46, ty = 290;
    lg.fillStyle = 'rgba(255,40,70,0.30)';
    for (let y = ey + 6; y < ty; y++) {
      const k = (y - ey) / (ty - ey), mid = ex + (cx - ex) * k, w = 2 + hw * k;
      for (let x = Math.round(mid - w); x <= Math.round(mid + w); x++) if ((x + y) % 2 === 0) lg.fillRect(x, y, 1, 1);
    }
  }
  // a barrel in flight: thrown from the crew member's hands in an arc to its target
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
  // winners walk from the dock up the nearest gangplank and onto the deck
  function boardPos(r, x, y, now, arrived) {
    if (!r.board) {
      if (!arrived) return null;
      const plank = SHIP.planks.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
      const side = plank < SHIP.cx ? 0 : 1, n = S.deckN[side]++;
      const slot = plank + (side ? -1 : 1) * (24 + n * 15);
      r.board = { t0: now, path: PXP.boardPath(x, y, plank, SHIP.dock + 4, SHIP.deck, slot) };
    }
    return PXP.along(r.board.path, (now - r.board.t0) / 1000 * 70);
  }

  /* ---------------------------------------------------------------- players */
  const mix = id => { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const RUN = ['a', 'idle', 'c', 'idle'];
  function drawSprite(s, x, y) { lg.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height + 1)); }
  function nameTag(r, x, y, gold) {
    const t = PX.fontClean(String(r.name).replace(/^Bot\s+/, '').split(/\s+/)[0]).slice(0, 7) || pad(r.num);
    const w = PX.textW(t) + 4, tx = Math.round(x - w / 2);
    lg.fillStyle = gold ? C.gold : C.ink; lg.fillRect(tx, y, w, 9);
    lg.fillStyle = gold ? C.gold3 : C.navy3; lg.fillRect(tx, y, w, 1);
    PX.text(lg, t, tx + 2, y + 2, gold ? C.ink : C.white);
    lg.fillStyle = gold ? C.gold : C.ink; lg.fillRect(Math.round(x) - 1, y + 9, 2, 1);
  }
  function collectPlayers(now, dt, list) {
    const moving = S.phase === 'green' || S.phase === 'turning';
    const lobbyList = S.phase === 'lobby' ? [...S.players.values()].sort((a, b) => mix(a.id) - mix(b.id)) : null;
    for (const r of S.players.values()) {
      if (r.status === 'waiting') continue;
      let lane = r.lane;
      if (lobbyList) { /* lane comes from the big screen's random line-up */ }
      else if (r.status === 'ready') continue;
      let target = r.pos / 100;
      if (lobbyList) target = 0;
      if (r.status === 'won') target = 1.08 + (r.rank % 2) * 0.03;
      const before = r.dpos;
      if (r.status !== 'out') r.dpos += (target - r.dpos) * Math.min(1, dt * (r.status === 'won' ? 3 : 12));
      const running = (r.status === 'alive' && (r.moving || Math.abs(r.dpos - before) > dt * 0.01)) || (r.status === 'won' && Math.abs(target - r.dpos) > 0.006);
      r.running = running;
      if (running) {
        r.anim += dt * 11;
        const idx = Math.floor(r.anim);
        if (idx !== r.lastStepIdx) { r.lastStepIdx = idx; if (RUN[idx % 4] !== 'idle') { sfx.step(0.35 + 0.4 * (1 - Math.min(1, r.dpos))); dust(laneX(lane), progY(r.dpos)); } }
      }
      let x = r.status === 'out' && r.outX != null ? r.outX : laneX(lane);
      let y = r.status === 'out' && r.outY != null ? r.outY : progY(r.dpos);
      if (r.status === 'out' && r.shotAt && now < r.shotAt && r.fleeAt) { const fp = fleePos(r, (now - r.fleeAt) / r.fleeMs); x = fp.x; y = fp.y; }
      if (r.status !== 'won') r.board = null;
      else if (PIR()) {
        const b = boardPos(r, x, y, now, Math.abs((1.08 + (r.rank % 2) * 0.03) - r.dpos) < 0.01);
        if (b) { x = Math.round(b.x); y = Math.round(b.y); r.bdone = b.done; if (!b.done) r.anim += dt * 11; }
      }
      list.push({ y, draw: () => drawPlayer(r, x, y, now, lane) });
    }
  }
  function fleePos(r, k) {
    k = Math.max(0, Math.min(1, k));
    const e = 1 - Math.pow(1 - k, 2), d = r.fleeDir || 1;
    let dx = 0, dy = 0;
    switch (r.fleeStyle) {
      case 'side': dx = d * 46 * e; dy = Math.sin(k * 9) * 2; break;
      case 'back': dx = Math.sin(k * 7) * 8; dy = 40 * e; break;
      case 'zigzag': dx = Math.sin(k * Math.PI * 4) * 16; dy = 18 * e; break;
      case 'scatter': dx = d * 30 * e; dy = 26 * e; break;
      default: dx = d * 10 * e; dy = -22 * e;            // forward: a desperate dash for the line
    }
    return { x: Math.round(Math.max(FX0 + 8, Math.min(FX1 - 8, r.startX + dx))), y: Math.round(Math.max(FIN_Y + 8, Math.min(START_Y, r.startY + dy))) };
  }
  function drawPlayer(r, x, y, now, lane) {
    const t = now / 1000;
    if (PIR() && r.status === 'won' && r.board) { drawBoarder(r, x, y, t); return; }
    lg.fillStyle = 'rgba(40,24,8,0.28)'; lg.fillRect(x - 5, y, 11, 2); lg.fillRect(x - 4, y + 2, 9, 1);
    if (PIR() && r.status === 'out' && r.shotAt) { drawDizzyOut(r, x, y, now); return; }
    if (r.status === 'out' && r.shotAt) {
      const e = now - r.shotAt;
      if (e < 0) {
        const k = r.fleeAt ? (now - r.fleeAt) / r.fleeMs : 1;
        const towardCamera = r.fleeStyle === 'back' || (r.fleeStyle === 'scatter' && k > 0.2);
        const fr = ['a', 'idle', 'c', 'idle'][Math.floor(now / 70) % 4];
        drawSprite(PX.charSprite(r.look, towardCamera ? 'front' : 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
        if (Math.floor(now / 160) % 3 === 0) { dust(x, y); if (Math.floor(now / 160) % 6 === 0) sfx.step(0.5); }
        if (Math.floor(now / 70) % 2 === 0) {
          lg.fillStyle = C.red;
          const x0 = x - 9, x1 = x + 8, y0 = y - 24, y1 = y + 2;
          lg.fillRect(x0, y0, 4, 1); lg.fillRect(x0, y0, 1, 4);
          lg.fillRect(x1 - 3, y0, 4, 1); lg.fillRect(x1, y0, 1, 4);
          lg.fillRect(x0, y1, 4, 1); lg.fillRect(x0, y1 - 3, 1, 4);
          lg.fillRect(x1 - 3, y1, 4, 1); lg.fillRect(x1, y1 - 3, 1, 4);
        }
        PX.line(lg, r.guard.muzzle.x, r.guard.muzzle.y, x, y - 12, 'rgba(255,40,70,0.9)', 3);
        return;
      }
      if (e > 60) {
        const k = Math.min(1, (e - 60) / 650), fade = 1;
        lg.globalAlpha = fade;
        const ox = r.fallDir === 'fallL' ? -5 : 5;
        PX.ell(lg, x + ox, y - 1, Math.max(1, Math.round(9 * k)), Math.max(1, Math.round(3 * k)), C.blood);
        if (k > 0.5) { lg.fillStyle = C.blood2; lg.fillRect(x + ox - 3, y - 2, 3, 1); }
        lg.globalAlpha = 1;
      }
      if (e < 80) { drawSprite(PX.charSprite(r.look, 'back', 'idle', 'flash'), x, y - 1); return; }
      const s = PX.charSprite(r.look, 'back', 'idle', e > 700 ? r.fallDir + 'g' : r.fallDir);
      const ox = r.fallDir === 'fallL' ? -6 : 6;
      lg.drawImage(s, Math.round(x + ox - s.width / 2), Math.round(y - s.height + 1));
      if (e < 1500) TAGS.push({ t: 'OUT!', x, y: y - 28 - (e / 1500) * 12, size: 9, col: C.red, out: C.ink });
      return;
    }
    if (r.status === 'won') {
      const arrived = Math.abs((1.08 + (r.rank % 2) * 0.03) - r.dpos) < 0.01;
      lg.fillStyle = 'rgba(255,217,122,0.55)'; lg.fillRect(x - 7, y - 1, 15, 3);
      const frame = arrived ? (Math.floor(t * 4) % 2 ? 'cheer' : 'cheer2') : RUN[Math.floor(r.anim) % 4];
      drawSprite(PX.charSprite(r.look, arrived ? 'front' : 'back', frame), x, y);
      if (arrived && Math.random() < 0.15) sparkle(x, y);
      TAGS.push({ t: '#' + r.rank + (PIR() ? ' ABOARD' : ' SAFE'), x, y: y - 29, size: 6.5, col: C.ink, box: C.gold, pointer: true });
      return;
    }
    const frame = r.running ? RUN[Math.floor(r.anim) % 4] : 'idle';
    const bob = r.running && frame === 'idle' ? -1 : 0;
    lg.globalAlpha = r.connected || r.bot ? 1 : 0.5;
    drawSprite(PX.charSprite(r.look, 'back', frame), x, y + bob);
    lg.globalAlpha = 1;
    const nm = shortName(r.name) || pad(r.num);
    const ty = y - 28 - (Math.round(lane * 19) % 2) * 10;
    if (r.local) drawYouArrow(x, y - 26, t);     // your own runner: arrow only, no name
    else TAGS.push({ t: nm, x, y: ty, size: 6, col: C.white, box: C.navy, pointer: true, weight: 600 });
  }

  // pirate edition: caught players run, get hit by a barrel, turn black-and-white and see stars
  function drawDizzyOut(r, x, y, now) {
    const t = now / 1000, e = now - r.shotAt;
    if (e < 0) {
      const k = r.fleeAt ? (now - r.fleeAt) / r.fleeMs : 1;
      const towardCamera = r.fleeStyle === 'back' || (r.fleeStyle === 'scatter' && k > 0.2);
      const fr = ['a', 'idle', 'c', 'idle'][Math.floor(now / 70) % 4];
      drawSprite(PX.charSprite(r.look, towardCamera ? 'front' : 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
      if (Math.floor(now / 160) % 3 === 0) { dust(x, y); if (Math.floor(now / 160) % 6 === 0) sfx.step(0.5); }
      if (Math.floor(now / 70) % 2 === 0) {
        lg.fillStyle = C.red;
        const x0 = x - 9, x1 = x + 8, y0 = y - 24, y1 = y + 2;
        lg.fillRect(x0, y0, 4, 1); lg.fillRect(x0, y0, 1, 4); lg.fillRect(x1 - 3, y0, 4, 1); lg.fillRect(x1, y0, 1, 4);
        lg.fillRect(x0, y1, 4, 1); lg.fillRect(x0, y1 - 3, 1, 4); lg.fillRect(x1 - 3, y1, 4, 1); lg.fillRect(x1, y1 - 3, 1, 4);
      }
      return;
    }
    if (e < 80) { drawSprite(PX.charSprite(r.look, 'back', 'idle', 'flash'), x, y - 1); return; }
    if (e < 650) {
      // stunned on their feet for a moment, wobbling
      drawSprite(PX.charSprite(r.look, 'back', 'idle', 'grey'), x + (Math.floor(e / 90) % 2 ? -1 : 1), y);
      PXP.dizzy(lg, x, y - 22, t);
    } else {
      const s = PX.charSprite(r.look, 'back', 'idle', r.fallDir + 'g');
      const ox = r.fallDir === 'fallL' ? -6 : 6, dx = Math.round(x + ox - s.width / 2), dy = Math.round(y - s.height + 1);
      lg.drawImage(s, dx, dy);
      const hx = r.fallDir === 'fallL' ? dx + 4 : dx + s.width - 4;
      PXP.dizzy(lg, hx, dy - 3, t);
    }
    if (e < 1500) TAGS.push({ t: 'OUT!', x, y: y - 30 - (e / 1500) * 12, size: 9, col: C.red, out: C.ink });
  }
  function drawBoarder(r, x, y, t) {
    if (!r.bdone) {
      const fr = RUN[Math.floor(r.anim) % 4];
      lg.fillStyle = 'rgba(40,24,8,0.28)'; lg.fillRect(x - 5, y, 11, 2);
      drawSprite(PX.charSprite(r.look, 'back', fr), x, y - (fr === 'idle' ? 1 : 0));
    } else {
      drawSprite(PX.charSprite(r.look, 'front', Math.floor(t * 4) % 2 ? 'cheer' : 'cheer2'), x, y);
      if (Math.random() < 0.12) sparkle(x, y - 8);
    }
    // on deck the rank sits on the ship's side, below the rail, so it stays clear of the corner buttons
    if (r.bdone) TAGS.push({ t: '#' + r.rank, x, y: y + 8, size: 6.5, col: C.ink, box: C.gold });
    else TAGS.push({ t: '#' + r.rank + ' ABOARD', x, y: y - 29, size: 6.5, col: C.ink, box: C.gold, pointer: true });
  }

  function shortName(n) { return String(n || '').replace(/^Bot\s+/, '').replace(/\s+/g, ' ').trim().slice(0, 6); }
  // gold arrow over your own runner (only shown for the player on this screen)
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
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    lg.drawImage(BG, 0, 0);
    TAGS.length = 0;

    const list = [];
    const dv = dollView(now);
    const red = S.phase === 'red' || S.phase === 'turnback';
    const mouth = 0;
    const hop = dv === 'side' ? -1 : 0;
    if (PIR()) {
      // the captain (spyglass up while he watches), his two crew with barrels, and the ship's rail in front of the deck
      list.push({ y: DOLL.y, draw: () => {
        const s = PXP.captain(dv, red && dv !== 'back', red && dv === 'front'); lg.drawImage(s, DOLL.x - 28, DOLL.y - s.height + 3 + hop);
        if (red && dv === 'front' && Math.floor(t * 8) % 2) { lg.fillStyle = 'rgba(255,60,80,0.55)'; lg.fillRect(DOLL.x - 8, DOLL.y - 55, 7, 7); }
      } });
      for (const gd of GUARDS) list.push({ y: gd.y, draw: () => { const s = PXP.crew(gd.kind, crewPose(gd, now), gd.mirror); lg.drawImage(s, gd.x - 15, gd.y - s.height + 3); } });
      if (SHIPFG) list.push({ y: SHIP.deck + 0.5, draw: () => lg.drawImage(SHIPFG, 0, 0) });
    } else {
    list.push({ y: DOLL.y, draw: () => {
      const s = PX.doll(dv, red && dv !== 'back', mouth); lg.drawImage(s, DOLL.x - 22, DOLL.y - s.height + 3 + hop);
      if (red && dv === 'front' && Math.floor(t * 8) % 2) { lg.fillStyle = 'rgba(255,60,80,0.5)'; lg.fillRect(DOLL.x - 8, DOLL.y - 52, 5, 5); lg.fillRect(DOLL.x + 3, DOLL.y - 52, 5, 5); }
    } });
    for (const gd of GUARDS) {
      let firing = false;
      for (const r of S.players.values()) if (r.guard === gd && r.shots) for (const sh of r.shots) if (now >= sh.at && now - sh.at < 80) firing = true;
      list.push({ y: gd.y, draw: () => { const s = PX.guard(gd.shape, firing, gd.mirror); lg.drawImage(s, gd.mirror ? gd.x - 19 : gd.x - 10, gd.y - 31); } });
    }
    }
    collectPlayers(now, dt, list);
    list.sort((a, b) => a.y - b.y);
    if (PIR()) drawBeamPirate(t); else drawBeam(t);
    for (const it of list) it.draw();

    // pirate edition: barrels in the air
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
        if (sh.miss && !sh.puffed) { sh.puffed = true; for (let i = 0; i < 5; i++) dust(tx, ty + 1); }
      }
    }
    drawParticles(dt);

    if (S.flash > 0.01) { lg.fillStyle = `rgba(255,255,255,${S.flash})`; lg.fillRect(0, 0, LW, LH); S.flash *= Math.pow(0.0005, dt); }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.navy2; ctx.fillRect(0, 0, cv.width, cv.height);
    let sx = 0, sy = 0;
    if (S.shake > 0.3) { sx = Math.round((Math.random() - 0.5) * S.shake * 2); sy = Math.round((Math.random() - 0.5) * S.shake * 2); S.shake *= Math.pow(0.02, dt); } else S.shake = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L, view.ox + sx * view.s, view.oy + sy * view.s, LW * view.s, LH * view.s);
    if (vignette) ctx.drawImage(vignette, 0, 0);
    drawLabels(LABELS, sx, sy);
    drawLabels(TAGS, sx, sy);

    updateBubble(now);
    if (S.phase !== 'lobby' && S.phase !== 'ended') updateHud();
    requestAnimationFrame(frame);
  }

  /* Fit the lobby / podium panels and the corner controls to any screen size (laptop, projector, TV) */
  function fitUI() {
    const W = innerWidth, H = innerHeight;
    const corner = Math.max(0.6, Math.min(1, W / 1600, H / 900));
    for (const id of ['tools', 'hud', 'feed']) { const el = $(id); if (el) el.style.zoom = corner; }
    const topSpace = ($('tools').offsetHeight || 40) * corner + 20;
    for (const sel of ['#lobby .wrap', '#podium .wrap']) {
      const el = document.querySelector(sel); if (!el || !el.offsetParent) continue;
      el.style.zoom = 1;
      const z = Math.min(1, (W - 32) / el.offsetWidth, (H - topSpace - 16) / el.offsetHeight);
      el.style.zoom = Math.max(0.35, z);
      el.parentElement.style.paddingTop = topSpace + 'px';
    }
  }
  addEventListener('resize', fitUI);
  window.fitUI = fitUI;

  window.startHost = function (engine) {
    ENGINE = engine;
    BG = buildBG();
    setMode(MODE);
    S.winnersCount = engine.cfg.winnersCount; S.maxPlayers = engine.cfg.maxPlayers;
    document.querySelectorAll('.wc').forEach(e => { e.textContent = S.winnersCount; });
    turn('front', 1);
    drawQr(window.JOIN_URL);
    resize();
    requestAnimationFrame(frame);
    setTimeout(fitUI, 50); if (document.fonts) document.fonts.ready.then(fitUI);
  };
  window.hostOnMsg = onMsg;
  window.__hostState = S;
})();

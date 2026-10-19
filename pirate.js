/* ALL ABOARD! — pirate edition art kit.
   The pirate ship, the captain (instead of the doll), his two crew (instead of the guards),
   barrels, and the dizzy stars over caught players. Same pixel style and helpers as sprites.js (PX). */
(function () {
  'use strict';
  const C = PX.C, R = PX.R;
  const K = {
    coat: '#b3243a', coat2: '#7f1528', coat3: '#d94356',
    hat: '#211a30', hat2: '#3d3157',
    beard: '#3a2418', beard2: '#5a3a26',
    skin: '#e2ad80', skin2: '#bf8558',
    brass: '#d9a441', brass2: '#9c6d22', brass3: '#ffe08a',
    plank: '#a8774a', plank2: '#87592f', plank3: '#c69563', plank4: '#5c3b22',
    hull: '#6e4326', hull2: '#53321c', hull3: '#8c5a34', hull4: '#3c2414',
    sail: '#f3e7c8', sail2: '#dccba0', sail3: '#fffaec',
    sea1: '#1d5f9c', sea2: '#2677b8', sea3: '#3f97d4', sea4: '#7cc3ee', foam: '#e8f7ff',
    rope: '#d8b778', star: '#ffe14d', star2: '#f5a524'
  };

  /* ---------------- the captain (front / side / back), 56 x 76 ---------------- */
  function buildCaptain(view, o) {
    o = o || {};
    const W = 56, H = 76, c = PX.cnv(W, H), g = c.getContext('2d'), cx = 28;
    const side = view === 'side', back = view === 'back', front = view === 'front';
    const k = side ? 0.62 : 1;
    const LY = 63, CT = 31, CB = 64, HY = 21;

    // legs: one boot, one wooden peg leg
    if (!side) {
      const bootX = back ? cx + 1 : cx - 9, pegX = back ? cx - 7 : cx + 4;
      R(g, bootX + 1, LY, 6, 6, C.pants2); R(g, pegX - 1, LY, 5, 4, C.pants2);
      R(g, bootX, LY + 6, 8, 6, K.hull4); R(g, bootX, LY + 6, 8, 1, K.hull3); R(g, back ? bootX + 6 : bootX - 1, LY + 9, 2, 3, K.hull4);
      R(g, pegX, LY + 4, 3, 8, K.plank); R(g, pegX, LY + 4, 1, 8, K.plank3); R(g, pegX, LY + 11, 3, 1, K.plank4);
    } else {
      R(g, cx - 3, LY, 6, 6, C.pants2); R(g, cx - 3, LY + 6, 9, 6, K.hull4); R(g, cx - 3, LY + 6, 9, 1, K.hull3);
    }

    // long red coat
    for (let y = CT; y < CB; y++) {
      const hw = Math.round((11 + (y - CT) * 0.38) * k);
      R(g, cx - hw, y, hw * 2 + 1, 1, K.coat);
      R(g, cx - hw, y, 2, 1, K.coat3); R(g, cx + hw - 1, y, 2, 1, K.coat2);
    }
    const hh = Math.round((11 + (CB - 1 - CT) * 0.38) * k);
    R(g, cx - hh, CB - 3, hh * 2 + 1, 3, C.gold); R(g, cx - hh, CB - 3, hh * 2 + 1, 1, C.gold3);
    if (front) {
      for (let y = CT; y < CT + 15; y++) { const w = Math.max(0, Math.round((15 - (y - CT)) * 0.4)); if (w) R(g, cx - w, y, w * 2 + 1, 1, C.cream); }
      R(g, cx - 1, CT + 1, 3, 4, C.white);
      for (let y = 50; y < CB - 3; y++) { const w = 1 + Math.round((y - 50) * 0.25); R(g, cx - w, y, w * 2 + 1, 1, C.pants); }
      R(g, cx - 1, 50, 3, CB - 53, C.pants2);
      for (let y = CT + 3; y < 46; y += 4) { R(g, cx - 7, y, 2, 2, C.gold3); R(g, cx + 6, y, 2, 2, C.gold3); }
    }
    if (back) { R(g, cx, 49, 1, CB - 52, K.coat2); R(g, cx - 4, 40, 9, 1, K.coat2); R(g, cx - 3, 41, 2, 2, C.gold); R(g, cx + 2, 41, 2, 2, C.gold); }
    // belt
    const bw = Math.round(16 * k);
    R(g, cx - bw, 46, bw * 2 + 1, 3, K.hull4);
    if (!back) { R(g, (side ? cx + 3 : cx - 2), 46, 5, 3, K.brass); R(g, (side ? cx + 4 : cx - 1), 47, 3, 1, K.hull4); }
    // gold epaulettes
    if (!side) for (const sx of [-1, 1]) {
      const ex = sx < 0 ? cx - 17 : cx + 11;
      R(g, ex, CT - 1, 7, 3, C.gold); R(g, ex, CT - 1, 7, 1, C.gold3);
      for (let i = 0; i < 7; i += 2) R(g, ex + i, CT + 2, 1, 2, C.gold2);
    }

    // arms
    const sleeve = (x, y, h) => { R(g, x, y, 5, h, K.coat); R(g, x, y, 1, h, K.coat3); R(g, x + 4, y, 1, h, K.coat2); R(g, x - 1, y + h, 7, 2, C.gold); };
    const hook = (x, y) => { R(g, x + 1, y, 2, 3, C.grey); R(g, x + 1, y + 3, 1, 2, C.grey3); R(g, x - 1, y + 5, 2, 1, C.grey3); R(g, x - 2, y + 3, 1, 2, C.grey3); };
    if (front) {
      if (o.spy) {
        // left arm raised: spyglass held to his eye (drawn after the head)
        R(g, cx - 19, CT + 1, 5, 9, K.coat); R(g, cx - 19, CT + 1, 1, 9, K.coat3);
        R(g, cx - 16, CT - 4, 6, 6, K.coat); R(g, cx - 13, CT - 7, 5, 4, C.gold);
      } else {
        sleeve(cx - 19, CT + 1, 16); R(g, cx - 18, CT + 19, 4, 3, K.skin); R(g, cx - 18, CT + 21, 4, 1, K.skin2);
      }
      sleeve(cx + 15, CT + 1, 16); hook(cx + 15, CT + 19);
    } else if (back) {
      sleeve(cx - 19, CT + 1, 16); hook(cx - 18, CT + 19);
      sleeve(cx + 15, CT + 1, 16); R(g, cx + 16, CT + 19, 4, 3, K.skin);
    } else {
      sleeve(cx - 1, CT + 2, 15); R(g, cx, CT + 19, 4, 3, K.skin);
    }

    // head + beard
    if (front) {
      PX.disc(g, cx, HY, 9, K.skin);
      R(g, cx - 10, HY - 6, 3, 11, K.beard); R(g, cx + 8, HY - 6, 3, 11, K.beard);
      R(g, cx - 7, HY - 3, 4, 1, K.beard);                                  // brow
      R(g, cx - 6, HY - 1, 3, 3, o.red ? C.red : C.ink);
      R(g, cx - 6, HY - 1, 1, 1, o.red ? '#ffd0d6' : C.white);
      R(g, cx - 9, HY - 5, 19, 1, C.ink);                                  // patch strap
      R(g, cx + 2, HY - 3, 5, 5, C.ink); R(g, cx + 3, HY - 2, 1, 1, C.ink2);  // eye patch
      R(g, cx - 1, HY + 1, 3, 3, K.skin2);                                 // nose
      R(g, cx - 8, HY + 2, 2, 1, C.pink);
      PX.ell(g, cx, HY + 10, 10, 6, K.beard);
      PX.ell(g, cx, HY + 9, 8, 4, K.beard2);
      R(g, cx - 2, HY + 13, 5, 3, K.beard2); R(g, cx - 1, HY + 16, 3, 1, K.beard);
      R(g, cx - 8, HY + 4, 7, 2, K.beard); R(g, cx + 2, HY + 4, 7, 2, K.beard);   // moustache
      R(g, cx - 9, HY + 3, 1, 2, K.beard); R(g, cx + 9, HY + 3, 1, 2, K.beard);
      R(g, cx - 3, HY + 6, 7, 3, C.mouth); R(g, cx + 1, HY + 6, 2, 1, C.gold3);    // grin with a gold tooth
    } else if (back) {
      PX.disc(g, cx, HY, 9, K.beard);
      R(g, cx - 10, HY - 4, 21, 10, K.beard);
      R(g, cx - 6, HY - 2, 5, 1, K.beard2); R(g, cx + 2, HY + 1, 4, 1, K.beard2);
      R(g, cx - 2, HY + 6, 5, 9, K.beard); R(g, cx - 3, HY + 7, 7, 2, C.red); R(g, cx - 1, HY + 15, 3, 2, K.beard);   // ponytail
      PX.ell(g, cx - 9, HY + 8, 2, 4, K.beard); PX.ell(g, cx + 9, HY + 8, 2, 4, K.beard);
    } else {
      PX.disc(g, cx + 1, HY, 9, K.skin);
      R(g, cx - 8, HY - 6, 7, 13, K.beard);
      R(g, cx + 10, HY, 2, 3, K.skin2);                                     // nose
      R(g, cx + 5, HY - 1, 2, 2, o.red ? C.red : C.ink);
      PX.ell(g, cx + 4, HY + 9, 7, 6, K.beard); R(g, cx + 6, HY + 4, 5, 2, K.beard);
      R(g, cx + 7, HY + 6, 4, 2, C.mouth);
    }

    // tricorn hat
    const HT = 3, BY = 12;
    if (!side) {
      for (let y = HT; y < BY; y++) { const hw = Math.round(8 + (y - HT) * 0.6); R(g, cx - hw, y, hw * 2 + 1, 1, K.hat); }
      R(g, cx - 7, HT + 1, 5, 1, K.hat2);
      R(g, cx - 22, BY, 45, 2, K.hat); R(g, cx - 18, BY + 2, 37, 1, K.hat);
      R(g, cx - 23, BY - 4, 4, 5, K.hat); R(g, cx + 20, BY - 4, 4, 5, K.hat);   // turned-up points
      R(g, cx - 22, BY - 5, 2, 1, K.hat); R(g, cx + 21, BY - 5, 2, 1, K.hat);
      R(g, cx - 19, BY - 1, 39, 1, C.gold); R(g, cx - 23, BY - 4, 1, 4, C.gold); R(g, cx + 23, BY - 4, 1, 4, C.gold);
      if (front) {
        R(g, cx - 2, HT + 2, 5, 4, C.white); R(g, cx - 1, HT + 6, 3, 1, C.white);
        R(g, cx - 1, HT + 3, 1, 1, C.ink); R(g, cx + 1, HT + 3, 1, 1, C.ink);
        PX.line(g, cx - 4, HT + 6, cx + 4, HT + 8, C.white); PX.line(g, cx + 4, HT + 6, cx - 4, HT + 8, C.white);
      }
    } else {
      for (let y = HT; y < BY; y++) { const hw = Math.round(5 + (y - HT) * 0.5); R(g, cx - hw, y, hw * 2 + 1, 1, K.hat); }
      R(g, cx - 13, BY, 27, 2, K.hat); R(g, cx + 10, BY - 4, 6, 4, K.hat); R(g, cx - 15, BY - 2, 4, 3, K.hat);
      R(g, cx - 12, BY - 1, 24, 1, C.gold);
    }

    // spyglass in front of his eye (red light: he is watching)
    if (front && o.spy) {
      PX.disc(g, cx - 5, HY, 4, K.brass); PX.disc(g, cx - 5, HY, 2, K.brass2);
      R(g, cx - 6, HY - 1, 3, 3, o.red ? C.red : C.ink2);
      if (o.red) R(g, cx - 6, HY - 1, 1, 1, '#ffd0d6');
      R(g, cx - 9, HY + 3, 3, 3, K.skin);
    }
    return PX.outline(c, C.ink);
  }
  const capCache = new Map();
  function captain(view, red, spy) {
    const key = view + (red ? 'r' : '') + (spy ? 's' : '');
    if (!capCache.has(key)) capCache.set(key, buildCaptain(view, { red, spy }));
    return capCache.get(key);
  }

  /* ---------------- barrels ---------------- */
  function buildBarrel(sideways) {
    const c = PX.cnv(11, 12), g = c.getContext('2d');
    const rows = [3, 4, 5, 5, 5, 5, 5, 5, 4, 3];       // half-widths, top to bottom (9 wide max)
    rows.forEach((hw, i) => {
      const y = i + 1, x0 = 5 - hw + 1, w = hw * 2 - 1;
      R(g, x0, y, w, 1, K.plank);
      R(g, x0, y, 1, 1, K.plank3); R(g, x0 + 2, y, 1, 1, K.plank3); R(g, x0 + w - 2, y, 2, 1, K.plank2);
      if (i === 2 || i === 7) R(g, x0, y, w, 1, C.steel);
    });
    R(g, 3, 1, 5, 1, K.plank4);
    let out = PX.outline(c, C.ink);
    if (sideways) {
      const o = PX.cnv(12, 11), og = o.getContext('2d');
      og.translate(6, 5.5); og.rotate(Math.PI / 2); og.drawImage(out, -5.5, -6); out = o;
    }
    return out;
  }
  const BARREL = [null, null];
  function barrel(sideways) { const i = sideways ? 1 : 0; if (!BARREL[i]) BARREL[i] = buildBarrel(!!sideways); return BARREL[i]; }

  /* ---------------- the captain's crew: 'hold' (barrel at chest), 'up' (barrel overhead), 'throw' ---------------- */
  function buildCrew(kind, pose) {
    const W = 30, H = 46, c = PX.cnv(W, H), g = c.getContext('2d'), cx = 15, Y = 13;
    const a = kind === 'a';
    const band = a ? C.red : '#2a2438', band2 = a ? C.red2 : C.ink2;
    const st1 = C.white, st2 = a ? C.red : C.blue;
    const pants = a ? C.pants : K.plank2;
    R(g, cx - 6, Y + 29, 5, 3, K.hull4); R(g, cx + 1, Y + 29, 5, 3, K.hull4);       // boots
    R(g, cx - 5, Y + 21, 4, 8, pants); R(g, cx + 1, Y + 21, 4, 8, pants);         // trousers
    R(g, cx - 5, Y + 27, 4, 2, K.skin); R(g, cx + 1, Y + 27, 4, 2, K.skin);       // bare shins
    for (let y = Y + 10; y < Y + 21; y++) R(g, cx - 6, y, 13, 1, (y - Y) % 2 ? st1 : st2);   // striped shirt
    R(g, cx - 6, Y + 19, 13, 2, a ? C.gold2 : C.red);                              // sash
    R(g, cx - 2, Y + 10, 5, 1, K.skin);
    PX.disc(g, cx, Y + 5, 5, K.skin);
    R(g, cx - 5, Y, 11, 4, band); R(g, cx - 4, Y - 1, 9, 1, band); R(g, cx - 5, Y + 3, 11, 1, band2);
    R(g, cx + 5, Y + 2, 3, 2, band); R(g, cx + 7, Y + 4, 2, 3, band2);            // bandana knot
    if (!a) { R(g, cx - 1, Y, 3, 2, C.white); R(g, cx, Y + 1, 1, 1, band); }      // tiny skull
    R(g, cx - 3, Y + 5, 1, 2, C.ink); R(g, cx + 2, Y + 5, 1, 2, C.ink);
    if (a) R(g, cx - 2, Y + 8, 5, 1, C.mouth);
    else { R(g, cx - 4, Y + 8, 9, 2, K.beard2); R(g, cx - 1, Y + 8, 3, 1, C.mouth); R(g, cx - 6, Y + 6, 1, 2, C.gold); }
    const arm = (x, y, w, h) => { R(g, x, y, w, h, K.skin); };
    if (pose === 'up') {
      arm(cx - 8, Y - 3, 2, 14); arm(cx + 7, Y - 3, 2, 14);
      R(g, cx - 8, Y + 10, 2, 3, st2); R(g, cx + 7, Y + 10, 2, 3, st2);
      g.drawImage(barrel(false), cx - 5, 0);
    } else if (pose === 'throw') {
      arm(cx - 9, Y + 11, 2, 9); arm(cx + 8, Y + 11, 2, 9);
      R(g, cx - 9, Y + 11, 2, 2, st2); R(g, cx + 8, Y + 11, 2, 2, st2);
      R(g, cx - 10, Y + 19, 3, 2, K.skin); R(g, cx + 8, Y + 19, 3, 2, K.skin);
    } else {
      R(g, cx - 8, Y + 11, 2, 4, st2); R(g, cx + 7, Y + 11, 2, 4, st2);
      g.drawImage(barrel(false), cx - 5, Y + 10);
      arm(cx - 8, Y + 15, 3, 3); arm(cx + 6, Y + 15, 3, 3);
    }
    return PX.outline(c, C.ink);
  }
  const crewCache = new Map();
  function crew(kind, pose, mirror) {
    const key = kind + pose + (mirror ? 'm' : '');
    if (!crewCache.has(key)) { let s = buildCrew(kind, pose); if (mirror) s = PX.flipX(s); crewCache.set(key, s); }
    return crewCache.get(key);
  }

  /* ---------------- dizzy stars circling a caught player's head ---------------- */
  function star(g, x, y, col, big) {
    if (big) {
      R(g, x - 1, y - 3, 3, 7, C.ink); R(g, x - 3, y - 1, 7, 3, C.ink); R(g, x - 2, y - 2, 5, 5, C.ink);
      R(g, x, y - 2, 1, 5, col); R(g, x - 2, y, 5, 1, col); R(g, x - 1, y - 1, 3, 3, col); R(g, x, y, 1, 1, C.white);
    } else {
      R(g, x - 1, y - 2, 3, 5, C.ink); R(g, x - 2, y - 1, 5, 3, C.ink);
      R(g, x, y - 1, 1, 3, col); R(g, x - 1, y, 3, 1, col);
    }
  }
  function dizzy(g, x, y, t, small) {
    const rx = small ? 6 : 7, ry = 2.2;
    const items = [];
    for (let i = 0; i < 3; i++) { const a = t * 4.2 + i * Math.PI * 2 / 3; items.push({ a, x: Math.round(x + Math.cos(a) * rx), y: Math.round(y + Math.sin(a) * ry) }); }
    items.sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    // faint orbit ring
    g.fillStyle = 'rgba(255,225,77,0.35)';
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; if (i % 2) g.fillRect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1); }
    for (const it of items) star(g, it.x, it.y, Math.sin(it.a) > 0 ? K.star : K.star2, Math.sin(it.a) > 0 && !small);
  }

  /* ---------------- the ship ---------------- */
  // o: { cx, hw, deck (deck floor y), keel, top (main mast top y), s (detail scale), logo (img), planks: [x, x], dock (dock y) }
  function shipGeom(o) {
    const s = o.s || 1, x0 = o.cx - o.hw, x1 = o.cx + o.hw;
    return { s, x0, x1, sx1: x0 + Math.round(62 * s), fx0: x1 - Math.round(54 * s), sTop: o.deck - Math.round(19 * s), fTop: o.deck - Math.round(13 * s) };
  }
  function hullEdge(o, G, y) {
    const k = Math.max(0, Math.min(1, (y - o.deck) / (o.keel - o.deck)));
    return [G.x0 + Math.round(k * k * 24 * G.s), G.x1 - Math.round(Math.pow(k, 1.3) * 52 * G.s)];
  }
  function sail(g, cx, y0, y1, hw0, hw1) {
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / Math.max(1, y1 - y0), belly = Math.round(Math.sin(k * Math.PI) * 2);
      const hw = Math.round(hw0 + (hw1 - hw0) * k) + belly;
      R(g, cx - hw, y, hw * 2 + 1, 1, K.sail);
      R(g, cx - hw, y, 2, 1, K.sail2); R(g, cx + hw - 1, y, 2, 1, K.sail2);
      if (y - y0 < 2) R(g, cx - hw, y, hw * 2 + 1, 1, K.sail3);
    }
    const hb = hw1;
    for (let x = cx - hb + 5; x < cx + hb - 3; x += 7) for (let y = y0 + 2; y < y1; y += 2) R(g, x, y, 1, 1, K.sail2);
    R(g, cx - hb - 1, y1, hb * 2 + 3, 1, K.sail2);
  }
  function jolly(g, x, y, w, h) {
    R(g, x, y, w, h, '#1a1626');
    const cx = x + (w >> 1), cy = y + (h >> 1) - 1;
    R(g, cx - 2, cy - 2, 5, 4, C.white); R(g, cx - 1, cy + 2, 3, 1, C.white);
    R(g, cx - 1, cy - 1, 1, 1, '#1a1626'); R(g, cx + 1, cy - 1, 1, 1, '#1a1626');
    if (h >= 9) { PX.line(g, cx - 4, cy + 3, cx + 4, cy + 5, C.white); PX.line(g, cx + 4, cy + 3, cx - 4, cy + 5, C.white); }
  }
  function ship(g, o) {
    const G = shipGeom(o), s = G.s, { cx, deck, keel } = o;
    const masts = [
      { x: Math.round(cx - o.hw * 0.52), top: o.top + Math.round(12 * s), hw: Math.round(30 * s), logo: true },
      { x: cx, top: o.top, hw: Math.round(36 * s), logo: false },
      { x: Math.round(cx + o.hw * 0.5), top: o.top + Math.round(8 * s), hw: Math.round(30 * s), logo: true }
    ];
    // rigging behind the sails
    for (const m of masts) {
      PX.line(g, m.x, m.top + 2, m.x - m.hw - Math.round(6 * s), deck - 7, C.ink2, 2);
      PX.line(g, m.x, m.top + 2, m.x + m.hw + Math.round(6 * s), deck - 7, C.ink2, 2);
    }
    PX.line(g, masts[0].x, masts[0].top + 1, masts[1].x, masts[1].top + 1, C.ink2, 2);
    PX.line(g, masts[1].x, masts[1].top + 1, masts[2].x, masts[2].top + 1, C.ink2, 2);
    // bowsprit
    PX.line(g, G.x1 - 4, G.fTop + 3, G.x1 + Math.round(42 * s), G.fTop - Math.round(16 * s), K.hull2);
    PX.line(g, G.x1 - 4, G.fTop + 4, G.x1 + Math.round(42 * s), G.fTop - Math.round(15 * s), K.hull4);
    PX.line(g, G.x1 + Math.round(42 * s), G.fTop - Math.round(16 * s), masts[2].x, masts[2].top + 2, C.ink2, 2);
    for (const m of masts) {
      const len = deck - m.top;
      R(g, m.x - 1, m.top, 3, len, K.hull2); R(g, m.x - 1, m.top, 1, len, K.hull3);
      const u0 = m.top + Math.round(5 * s) + 1, u1 = m.top + Math.round(len * 0.36);
      const l0 = u1 + Math.round(4 * s) + 1, l1 = deck - Math.round(10 * s);
      const uh = Math.round(m.hw * 0.74);
      R(g, m.x - uh - 3, u0 - 2, uh * 2 + 7, 2, K.hull2);
      R(g, m.x - m.hw - 3, l0 - 2, m.hw * 2 + 7, 2, K.hull2);
      sail(g, m.x, u0, u1, uh - 2, uh);
      sail(g, m.x, l0, l1, m.hw - 2, m.hw);
      if (m.logo && o.logo) {
        const lw = Math.round(m.hw * 1.3), lh = Math.round((l1 - l0) * 0.72);
        g.globalAlpha = 0.9; g.drawImage(PX.pixelImage(o.logo, lw, lh, C.navy3), m.x - (lw >> 1), l0 + Math.round((l1 - l0 - lh) / 2) + 1); g.globalAlpha = 1;
      }
      if (!m.logo) jolly(g, m.x - Math.round(6 * s) - 2, u0 + Math.round((u1 - u0) / 2) - 4, Math.round(12 * s) + 4, 9);
      R(g, m.x - 1, m.top - 1, 3, 1, K.hull4);
    }
    // flag on the main mast
    const fx = masts[1].x + 2, fy = Math.max(0, o.top - Math.round(7 * s));
    R(g, masts[1].x, fy, 1, o.top - fy, K.hull2);
    jolly(g, fx, fy, Math.round(14 * s) + 2, Math.max(7, Math.round(9 * s)));
    R(g, fx + Math.round(14 * s) + 2, fy + 1, 2, Math.max(5, Math.round(7 * s)) - 1, '#1a1626');

    // hull
    for (let y = deck - 7; y <= keel; y++) {
      const [l, r] = hullEdge(o, G, y);
      let col = K.hull;
      if (y === deck - 7) col = C.ink2;
      else if (y < deck) col = (y === deck - 4) ? K.hull : K.hull3;
      else if (y <= deck + 1) col = y === deck ? C.gold : C.gold2;
      else if ((y - deck) % 4 === 0) col = K.hull2;
      if (y >= keel - 2) col = K.hull4;
      R(g, l, y, r - l + 1, 1, col);
      if (y >= deck) { R(g, l, y, 1, 1, K.hull4); R(g, r, y, 1, 1, K.hull4); }
    }
    // gold stripe + gun ports
    { const y = deck + Math.round(12 * s) + 2; const [l, r] = hullEdge(o, G, y); R(g, l + 1, y, r - l - 1, 1, C.gold2); }
    const pw = Math.max(3, Math.round(6 * s)), ph = Math.max(3, Math.round(5 * s)), py = deck + Math.round(4 * s) + 1;
    for (let x = G.x0 + Math.round(30 * s); x < G.x1 - Math.round(64 * s); x += Math.round(24 * s)) {
      R(g, x - 1, py - 1, pw + 2, ph + 2, C.gold2); R(g, x, py, pw, ph, K.hull4);
      R(g, x + 1, py + (ph >> 1), pw - 1, Math.max(1, ph >> 1), C.steel);
    }
    // stern castle (left) with lit windows and a lantern
    for (let y = G.sTop; y < deck; y++) {
      const col = y === G.sTop ? C.ink2 : y === G.sTop + 1 ? C.gold : (y - G.sTop) % 4 === 0 ? K.hull2 : K.hull;
      R(g, G.x0 - Math.round(3 * s), y, G.sx1 - G.x0 + Math.round(3 * s), 1, col);
    }
    for (let i = 0; i < 3; i++) { const wx = G.x0 + Math.round((8 + i * 17) * s), wy = G.sTop + Math.round(5 * s); R(g, wx - 1, wy - 1, Math.round(6 * s) + 2, Math.round(5 * s) + 2, C.gold2); R(g, wx, wy, Math.round(6 * s), Math.round(5 * s), K.brass3); }
    R(g, G.x0, G.sTop - Math.round(7 * s), 1, Math.round(7 * s), K.hull4);
    R(g, G.x0 - 1, G.sTop - Math.round(9 * s), 3, Math.max(3, Math.round(4 * s)), K.brass3); R(g, G.x0 - 1, G.sTop - Math.round(9 * s) - 1, 3, 1, C.ink);
    // forecastle (right)
    for (let y = G.fTop; y < deck; y++) {
      const [, r] = hullEdge(o, G, deck);
      const col = y === G.fTop ? C.ink2 : y === G.fTop + 1 ? C.gold : (y - G.fTop) % 4 === 0 ? K.hull2 : K.hull;
      R(g, G.fx0, y, r - G.fx0 + 1, 1, col);
    }
    // gangplanks down to the dock
    for (const px of o.planks || []) plank(g, o, px);
  }
  function plank(g, o, px) {
    const y0 = o.deck - 7, y1 = o.dock + Math.round(5 * (o.s || 1)), s = o.s || 1;
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / (y1 - y0), hw = Math.round((3 + k * 3) * Math.max(0.8, s));
      R(g, px - hw, y, hw * 2 + 1, 1, (y - y0) % 4 === 3 ? K.plank4 : K.plank);
      R(g, px - hw, y, 1, 1, K.plank4); R(g, px + hw, y, 1, 1, K.plank2);
      if ((y - y0) % 3 === 0) { R(g, px - hw - 2, y, 1, 1, K.rope); R(g, px + hw + 2, y, 1, 1, K.rope); }
    }
  }
  /* the ship's rail in front of the deck, with gaps where the gangplanks come up (drawn over players on deck) */
  function bulwark(lw, lh, o) {
    const c = PX.cnv(lw, lh), g = c.getContext('2d'), G = shipGeom(o);
    const gap = Math.round(5 * Math.max(0.8, G.s)) + 1;
    for (let y = o.deck - 7; y <= o.deck + 1; y++) {
      const col = y === o.deck - 7 ? C.ink2 : y < o.deck ? (y === o.deck - 4 ? K.hull : K.hull3) : y === o.deck ? C.gold : C.gold2;
      for (let x = G.sx1; x < G.fx0; x++) {
        if ((o.planks || []).some(p => Math.abs(x - p) <= gap)) continue;
        R(g, x, y, 1, 1, col);
      }
    }
    for (const p of o.planks || []) {
      R(g, p - gap - 1, o.deck - 9, 2, 10, K.hull4); R(g, p + gap, o.deck - 9, 2, 10, K.hull4);
      R(g, p - gap - 1, o.deck - 10, 2, 1, C.gold); R(g, p + gap, o.deck - 10, 2, 1, C.gold);
    }
    return c;
  }

  /* ---------------- sea, dock, beach ---------------- */
  function sea(g, lw, y0, y1, rnd) {
    const bands = [[y0, K.sea4], [y0 + 3, K.sea3], [y0 + Math.round((y1 - y0) * 0.35), K.sea2], [y0 + Math.round((y1 - y0) * 0.7), K.sea1]];
    bands.forEach(([a, col], i) => { const b = i + 1 < bands.length ? bands[i + 1][0] : y1; R(g, 0, a, lw, b - a, col); });
    for (let i = 0; i < lw * (y1 - y0) / 55; i++) {
      const x = Math.floor(rnd() * lw), y = y0 + 2 + Math.floor(rnd() * (y1 - y0 - 2)), w = 2 + Math.floor(rnd() * 5);
      R(g, x, y, w, 1, y < y0 + 8 ? K.sea4 : rnd() < 0.3 ? K.foam : K.sea3);
    }
    R(g, 0, y0, lw, 1, K.foam);
  }
  function island(g, x, y, w) {
    PX.ell(g, x, y, w, 3, '#2f7a5a'); PX.ell(g, x, y + 1, w - 2, 2, '#e3c18a');
    R(g, x + 2, y - 12, 1, 12, K.hull2); R(g, x + 3, y - 10, 1, 10, K.hull3);
    for (const [dx, dy] of [[-5, 1], [-3, 0], [3, 0], [5, 1], [-1, -1], [1, -1]]) PX.line(g, x + 2, y - 12, x + 2 + dx, y - 12 + dy + 2, '#2f9e55');
  }
  function gull(g, x, y) { R(g, x - 2, y, 2, 1, C.ink2); R(g, x, y + 1, 1, 1, C.ink2); R(g, x + 1, y, 2, 1, C.ink2); }
  function dock(g, x0, x1, y0, y1) {
    for (let y = y0; y < y1; y++) {
      const b = Math.floor((y - y0) / 5), row = (y - y0) % 5;
      R(g, x0, y, x1 - x0, 1, row === 4 ? K.plank2 : row === 0 ? K.plank3 : K.plank);
      for (let x = x0 + ((b * 37) % 60); x < x1; x += 60) R(g, x, y, 1, 1, K.plank4);
      if (row === 2) for (let x = x0 + 4 + ((b * 23) % 30); x < x1; x += 30) R(g, x, y, 1, 1, K.plank4);
    }
    R(g, x0, y0, x1 - x0, 1, K.plank4);
  }
  function dockEdge(g, x0, x1, y, step) {
    R(g, x0, y - 2, x1 - x0, 1, K.plank3); R(g, x0, y - 1, x1 - x0, 3, K.plank4); R(g, x0, y + 2, x1 - x0, 1, C.ink);
    const posts = [];
    for (let x = x0 + (step >> 1); x < x1; x += step) posts.push(x);
    for (let i = 0; i + 1 < posts.length; i++) {
      const a = posts[i], b = posts[i + 1];
      for (let x = a + 2; x < b - 1; x++) { const k = (x - a) / (b - a); R(g, x, y - 6 + Math.round(Math.sin(k * Math.PI) * 2), 1, 1, K.rope); }
    }
    for (const x of posts) { R(g, x - 2, y - 8, 4, 10, K.hull4); R(g, x - 2, y - 8, 4, 1, K.plank3); R(g, x - 1, y - 7, 1, 8, K.hull3); }
  }
  function shell(g, x, y, rnd) {
    if (rnd() < 0.5) { R(g, x, y, 2, 1, '#fbe9e0'); R(g, x, y + 1, 2, 1, '#e8b9a6'); }
    else { const col = '#f08c22'; R(g, x, y - 1, 1, 3, col); R(g, x - 1, y, 3, 1, col); }
  }

  /* boarding: from the dock to the nearest gangplank, up onto the deck, then along the deck */
  function boardPath(x, y, plankX, dockY, deckY, slotX) {
    return [{ x, y }, { x: plankX, y: dockY }, { x: plankX, y: deckY }, { x: slotX, y: deckY }];
  }
  function along(path, d) {
    for (let i = 0; i + 1 < path.length; i++) {
      const a = path[i], b = path[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      if (d <= len) { const k = len ? d / len : 1; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, done: false }; }
      d -= len;
    }
    const e = path[path.length - 1]; return { x: e.x, y: e.y, done: true };
  }

  window.PXP = { K, captain, crew, barrel, dizzy, ship, bulwark, sea, island, gull, dock, dockEdge, shell, boardPath, along, shipGeom };
})();

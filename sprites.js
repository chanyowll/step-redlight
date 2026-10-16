/* STEP Red Light, Green Light — pixel art kit.
   Everything is drawn on integer pixels into small canvases, outlined, and scaled up with nearest-neighbour. */
(function () {
  'use strict';
  const C = {
    ink: '#141022', ink2: '#2b2340',
    white: '#f6f2e8', cream: '#f3e3bd', cream2: '#dcc493', cream3: '#c2a46c',
    navy: '#14284f', navy2: '#0c1a36', navy3: '#21407a',
    blue: '#2a6fc9', blue2: '#1d4f93', blue3: '#4f93e0',
    jacket: '#8fd3ff', jacket2: '#55a6e6', jacket3: '#c9ecff',
    pants: '#2a3a78', pants2: '#1c2756',
    gold: '#f2b33d', gold2: '#c4831e', gold3: '#ffd97a',
    red: '#e0384f', red2: '#a3203a', blood: '#8c1426', blood2: '#b3243a',
    green: '#3cc46a', green2: '#228a47',
    sky1: '#3f8fe0', sky2: '#5fa9f0', sky3: '#86c3f7', sky4: '#b5dcfb',
    cloud: '#fbfdff', cloud2: '#d5e6f6',
    sand: '#e3c18a', sand2: '#d3aa6d', sand3: '#ecd3a3', sand4: '#b98f56', sand5: '#c99d60',
    wood: '#8a5a33', wood2: '#6b4224', wood3: '#a87444',
    grey: '#9aa0ad', grey2: '#6b7180', grey3: '#c9ccd4', steel: '#3a3f4b', steel2: '#23262e',
    pink: '#f08aa0', mouth: '#7a1f2b'
  };
  const SKINS = [['#f5cfa8', '#dca97f'], ['#e7b487', '#c48a5c'], ['#d39a67', '#ad7446'], ['#b77a4b', '#8f5832'], ['#f9dcc0', '#e0b38f'], ['#9c623a', '#774523']];
  const HAIRS = [['#1d1512', '#3a2a22'], ['#2e1f17', '#4d3627'], ['#120f10', '#2c2629'], ['#4a2c1a', '#6e4529'], ['#3b2416', '#5d3a24']];

  function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  /* add a 1px outline around opaque pixels (4-neighbour) */
  function outline(c, color) {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    const id = g.getImageData(0, 0, w, h), d = id.data, src = new Uint8ClampedArray(d);
    const [r, gg, b] = hex(color || C.ink);
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 127;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 127) { d[i + 3] = 255; continue; }
      d[i + 3] = 0;
      if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; }
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  function recolor(c, fn) {
    const o = cnv(c.width, c.height), g = o.getContext('2d'); g.drawImage(c, 0, 0);
    const id = g.getImageData(0, 0, o.width, o.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const [r, gg, b] = fn(d[i], d[i + 1], d[i + 2]); d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
    g.putImageData(id, 0, 0); return o;
  }
  const grey = c => recolor(c, (r, g, b) => { const v = Math.round((r * 0.3 + g * 0.55 + b * 0.15) * 0.75 + 30); return [v, v, v + 8]; });
  const flash = c => recolor(c, () => [255, 255, 255]);
  function rot90(c, dir) {
    const o = cnv(c.height, c.width), g = o.getContext('2d');
    g.translate(o.width / 2, o.height / 2); g.rotate(dir * Math.PI / 2); g.drawImage(c, -c.width / 2, -c.height / 2); return o;
  }
  function flipX(c) { const o = cnv(c.width, c.height), g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }

  /* integer drawing helpers */
  function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function disc(g, cx, cy, r, col) {
    g.fillStyle = col;
    for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); g.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); }
  }
  function ell(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5))))); g.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); }
  }
  function line(g, x0, y0, x1, y1, col, every) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; g.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) { if (!every || n % every === 0) g.fillRect(x0, y0, 1, 1); n++; if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }

  /* ---------------- 3x5 pixel font ---------------- */
  const F = {
    "A": ".#.#.#####.##.#",
    "B": "##.#.###.#.###.",
    "C": ".###..#..#...##",
    "D": "##.#.##.##.###.",
    "E": "####..##.#..###",
    "F": "####..##.#..#..",
    "G": ".###..#.##.#.##",
    "H": "#.##.#####.##.#",
    "I": "###.#..#..#.###",
    "J": "..#..#..##.#.#.",
    "K": "#.##.###.#.##.#",
    "L": "#..#..#..#..###",
    "M": "#.########.##.#",
    "N": "####.##.##.##.#",
    "O": ".#.#.##.##.#.#.",
    "P": "##.#.###.#..#..",
    "Q": ".#.#.##.###..##",
    "R": "##.#.###.#.##.#",
    "S": ".###...#...###.",
    "T": "###.#..#..#..#.",
    "U": "#.##.##.##.####",
    "V": "#.##.##.##.#.#.",
    "W": "#.##.########.#",
    "X": "#.##.#.#.#.##.#",
    "Y": "#.##.#.#..#..#.",
    "Z": "###..#.#.#..###",
    "0": "####.##.##.####",
    "1": ".#.##..#..#.###",
    "2": "##...#.#.#..###",
    "3": "##...#.#...###.",
    "4": "#.##.####..#..#",
    "5": "####..##...###.",
    "6": ".###..####.####",
    "7": "###..#.#..#..#.",
    "8": "####.#####.####",
    "9": "####.####..###.",
    "!": ".#..#..#.....#.",
    ".": ".............#.",
    "-": "......###......",
    "#": "#.#####.#####.#",
    "'": ".#..#..........",
    ",": "..........#.#..",
    "?": "##...#.#.....#.",
    ":": "....#.....#....",
    "/": "..#..#.#.#..#..",
    "&": ".#.#.#.#.#.#.##",
    "+": "....#.###.#....",
    " ": "..............."
  };
  const fontClean = s => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split('').map(ch => F[ch] ? ch : (ch === '_' ? '-' : '')).join('');
  function textW(s, sc = 1) { s = fontClean(s); return s.length ? (s.length * 4 - 1) * sc : 0; }
  function text(g, s, x, y, col, sc = 1, shadow) {
    s = fontClean(s); x |= 0; y |= 0;
    if (shadow) { text(g, s, x + sc, y + sc, shadow, sc); }
    g.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const gl = F[s[i]];
      for (let p = 0; p < 15; p++) if (gl[p] === '#') g.fillRect(x + (i * 4 + (p % 3)) * sc, y + Math.floor(p / 3) * sc, sc, sc);
    }
  }
  function textOutlined(g, s, x, y, col, out, sc = 1) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) text(g, s, x + dx * sc, y + dy * sc, out, sc);
    text(g, s, x, y, col, sc);
  }

  /* ---------------- player sprites (12 x 20) ---------------- */
  const BACK_UP = [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohHHhhhhho.',
    '.ohHhhhhhho.',
    '.ohhhhhhhho.',
    '.oShhhhhhSo.',
    '..ohhhhhho..',
    '...oSSSSo...',
    '.ooLLjjjJoo.',
    'oLwLjjjjJwJo',
    'oLwjjjjjJwJo',
    'oLwjjjjjJwJo',
    'osojjjjjJoso',
    '.oowwwwwwoo.'];
  const FRONT_UP = [
    '...oooooo...',
    '..ohhhhhho..',
    '.ohHHhhhhho.',
    '.ohssssssho.',
    '.osksssskso.',
    '.oSssssssSo.',
    '..ossmmsso..',
    '...oSSSSo...',
    '.ooLLwwjJoo.',
    'oLLjjwjjjJJo',
    'oLwjjwjjjwJo',
    'oLwjjwjjjwJo',
    'osojjwjjjoso',
    '.oowwwwwwoo.'];
  const LEGS = {
    idle: ['..oppppPPo..', '..oppooPPo..', '..oppooPPo..', '..oppooPPo..', '..oeeooEEo..', '..oooooooo..'],
    a: ['..oppppPPo..', '..oppooPPo..', '..oeeooPPo..', '..ooo.oPPo..', '......oEEo..', '......oooo..'],
    c: ['..oppppPPo..', '..oppooPPo..', '..oppooEEo..', '..oppo.ooo..', '..oeeo......', '..oooo......']
  };
  function look(id, gender) {
    const h = hash(id);
    const g = gender === 'f' || gender === 'm' ? gender : ((h >>> 11) % 2 ? 'f' : 'm');
    const style = g === 'f' ? [1, 2, 3][(h >>> 7) % 3] : 0;
    const si = h % SKINS.length, hi = (h >>> 3) % HAIRS.length;
    return { skin: SKINS[si], hair: HAIRS[hi], style, g, key: si + '-' + hi + '-' + style + g };
  }
  function buildChar(lk, view, frame) {
    let up = (view === 'front' ? FRONT_UP : BACK_UP).map(r => r.split(''));
    const legs = (frame === 'a' ? LEGS.a : frame === 'c' ? LEGS.c : LEGS.idle).map(r => r.split(''));
    let rows = up.concat(legs);
    // arm swing (back view)
    if (view === 'back' && frame === 'a') { rows[12] = 'osojjjjjJoJo'.split(''); }
    if (view === 'back' && frame === 'c') { rows[12] = 'oLojjjjjJoso'.split(''); }
    // hair styles
    if (view === 'back') {
      if (lk.style === 1) { rows[7][5] = 'h'; rows[7][6] = 'h'; rows[8][5] = 'h'; rows[8][6] = 'h'; }          // ponytail
      if (lk.style === 2) { rows[0] = '....oooo....'.split(''); rows.unshift('............'.split('')); rows.pop(); rows[0] = '....oooo....'.split(''); rows[1] = '...ohhhho...'.split(''); }
      if (lk.style === 3) { rows[6] = '.ohhhhhhhho.'.split(''); rows[7] = '.ohoSSSSoho.'.split(''); }            // long hair
    } else {
      if (lk.style === 3) { rows[5][1] = 'h'; rows[5][10] = 'h'; rows[6][1] = 'o'; rows[6][2] = 'h'; rows[6][9] = 'h'; rows[6][10] = 'o'; }
    }
    // girls wear a pink hair clip
    if (lk.g === 'f') {
      const r0 = rows.findIndex(r => r.includes('h'));
      if (r0 >= 0) { const r = rows[r0 + 1] || rows[r0]; const c = r.indexOf('h'); if (c >= 0) { r[c] = 'r'; if (r[c + 1] === 'h') r[c + 1] = 'r'; } }
    }
    // cheering: arms up (widen the grid by one column each side)
    if (frame === 'cheer' || frame === 'cheer2') {
      rows = rows.map(r => ['.'].concat(r, ['.']));
      const top = frame === 'cheer' ? 1 : 2;
      for (const [arm, out, inner, col] of [[1, 0, 2, 'L'], [12, 13, 11, 'J']]) {
        rows[top - 1][arm] = 'o';
        for (let r = top; r <= 9; r++) {
          rows[r][arm] = r < top + 2 ? 's' : col;
          rows[r][out] = 'o';
          if (rows[r][inner] === '.') rows[r][inner] = 'o';
        }
      }
      rows[12][2] = 'j'; rows[12][11] = 'J'; rows[12][1] = 'o'; rows[12][12] = 'o';
      rows[12][0] = '.'; rows[12][13] = '.';
    }
    const W = rows[0].length, H = rows.length, c = cnv(W, H), g = c.getContext('2d');
    const map = { o: C.ink, h: lk.hair[0], H: lk.hair[1], s: lk.skin[0], S: lk.skin[1], k: C.ink, m: C.mouth, j: C.jacket, J: C.jacket2, L: C.jacket3, w: C.white, p: C.pants, P: C.pants2, e: C.white, E: C.grey3, r: '#ff5f9e' };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = rows[y][x]; if (ch && ch !== '.' && map[ch]) { g.fillStyle = map[ch]; g.fillRect(x, y, 1, 1); } }
    return c;
  }
  const charCache = new Map();
  function charSprite(lk, view, frame, variant) {
    const key = lk.key + view + frame + (variant || '');
    let s = charCache.get(key);
    if (!s) {
      s = buildChar(lk, view, frame);
      if (variant === 'grey') s = grey(s);
      if (variant === 'flash') s = flash(s);
      if (variant === 'fallL') s = rot90(s, -1);
      if (variant === 'fallR') s = rot90(s, 1);
      if (variant === 'fallLg') s = grey(rot90(s, -1));
      if (variant === 'fallRg') s = grey(rot90(s, 1));
      charCache.set(key, s);
    }
    return s;
  }

  /* ---------------- the STEP doll (front / side / back) ---------------- */
  function buildDoll(view, opts = {}) {
    const W = 44, H = 66, c = cnv(W, H), g = c.getContext('2d');
    const cx = 22, skin = '#f7d7b5', skin2 = '#e4b892', hair = '#17110f', hair2 = '#3a2a23';
    const side = view === 'side';
    const k = side ? 0.62 : 1;
    // shoes, socks, legs
    if (!side) {
      R(g, cx - 9, 61, 7, 3, C.navy); R(g, cx + 2, 61, 7, 3, C.navy);
      R(g, cx - 8, 55, 5, 6, C.white); R(g, cx + 3, 55, 5, 6, C.white);
      R(g, cx - 8, 49, 5, 6, skin); R(g, cx + 3, 49, 5, 6, skin);
      R(g, cx - 4, 55, 1, 6, C.cream2); R(g, cx + 7, 55, 1, 6, C.cream2);
    } else {
      R(g, cx - 3, 61, 9, 3, C.navy); R(g, cx - 3, 55, 5, 6, C.white); R(g, cx - 3, 49, 5, 6, skin);
    }
    // dress (pinafore)
    for (let y = 27; y <= 50; y++) {
      const hw = Math.round((8 + (y - 27) * 7.5 / 23) * k);
      R(g, cx - hw, y, hw * 2 + 1, 1, C.blue);
      R(g, cx - hw, y, 2, 1, C.blue3);
      R(g, cx + hw - 2, y, 3, 1, C.blue2);
    }
    const hemHw = Math.round(15.5 * k);
    R(g, cx - hemHw, 46, hemHw * 2 + 1, 3, C.gold); R(g, cx - hemHw, 46, hemHw * 2 + 1, 1, C.gold3);
    R(g, cx - hemHw, 49, hemHw * 2 + 1, 2, C.navy);
    // arms + puff sleeves
    if (!side) {
      R(g, cx - 15, 31, 3, 13, skin); R(g, cx + 13, 31, 3, 13, skin);
      R(g, cx - 15, 43, 3, 3, skin2); R(g, cx + 13, 43, 3, 3, skin2);
      disc(g, cx - 11, 29, 4, C.cream); disc(g, cx + 11, 29, 4, C.cream);
      R(g, cx - 13, 31, 4, 1, C.cream2); R(g, cx + 10, 31, 4, 1, C.cream2);
    } else {
      R(g, cx + 1, 31, 3, 14, skin); disc(g, cx + 2, 29, 4, C.cream);
    }
    // front details
    if (view === 'front') {
      R(g, cx - 6, 25, 12, 3, C.white); R(g, cx - 1, 27, 2, 1, C.cream2);           // collar
      R(g, cx - 9, 31, 19, 9, C.gold2); R(g, cx - 8, 32, 17, 7, C.navy);            // chest patch
      text(g, 'STEP', cx - 7, 33, C.white);
      R(g, cx - 1, 41, 2, 2, C.gold); R(g, cx - 1, 44, 2, 1, C.gold);
    }
    if (view === 'back') {
      text(g, 'STEP', cx - 7, 34, C.white);
      R(g, cx - 6, 40, 5, 4, C.gold); R(g, cx + 2, 40, 5, 4, C.gold); R(g, cx - 1, 41, 3, 3, C.gold3);   // bow
      R(g, cx - 4, 44, 2, 3, C.gold2); R(g, cx + 3, 44, 2, 3, C.gold2);
    }
    // neck + head
    R(g, cx - 3, 21, 6, 5, skin2);
    const hy = 12;
    // pigtails
    if (!side) { ell(g, cx - 14, hy + 4, 4, 6, hair); ell(g, cx + 14, hy + 4, 4, 6, hair); R(g, cx - 15, hy + 1, 2, 3, hair2); R(g, cx + 14, hy + 1, 2, 3, hair2); }
    else { ell(g, cx - 10, hy + 5, 4, 6, hair); }
    if (view === 'front') {
      disc(g, cx, hy, 11, skin);
      // hair cap + bangs
      for (let y = -11; y <= -3; y++) { const hw = Math.floor(Math.sqrt(121 - y * y + 9)); R(g, cx - hw, hy + y, hw * 2 + 1, 1, hair); }
      R(g, cx - 11, hy - 3, 3, 11, hair); R(g, cx + 9, hy - 3, 3, 11, hair);
      R(g, cx - 6, hy - 8, 4, 1, hair2);
      // eyes
      const red = !!opts.red;
      R(g, cx - 6, hy + 1, 3, 3, red ? C.red : C.ink); R(g, cx + 4, hy + 1, 3, 3, red ? C.red : C.ink);
      if (red) { R(g, cx - 5, hy + 2, 1, 1, '#ffd0d6'); R(g, cx + 5, hy + 2, 1, 1, '#ffd0d6'); }
      else { R(g, cx - 6, hy + 1, 1, 1, C.white); R(g, cx + 4, hy + 1, 1, 1, C.white); }
      R(g, cx - 8, hy + 5, 2, 1, C.pink); R(g, cx + 7, hy + 5, 2, 1, C.pink);
      if (opts.mouth === 2) { R(g, cx - 1, hy + 6, 3, 3, C.mouth); }
      else if (opts.mouth === 1) { R(g, cx - 1, hy + 6, 3, 2, C.mouth); }
      else { R(g, cx - 1, hy + 7, 3, 1, C.mouth); }
    } else if (view === 'back') {
      disc(g, cx, hy, 11, hair);
      R(g, cx - 11, hy, 23, 9, hair);
      R(g, cx - 6, hy - 7, 5, 2, hair2); R(g, cx - 8, hy - 5, 3, 2, hair2);
    } else {
      disc(g, cx, hy, 11, skin);
      for (let y = -11; y <= 8; y++) { const hw = Math.floor(Math.sqrt(Math.max(0, 121 - y * y + 9))); R(g, cx - hw, hy + y, hw + (y < -3 ? hw + 1 : 3), 1, hair); }
      R(g, cx + 11, hy + 2, 2, 2, skin);                  // nose
      R(g, cx + 6, hy + 1, 2, 3, opts.red ? C.red : C.ink);
      R(g, cx + 7, hy + 5, 2, 1, C.pink);
    }
    // ribbons
    const rib = (x, y) => { R(g, x - 3, y, 3, 3, C.gold); R(g, x + 1, y, 3, 3, C.gold); R(g, x, y + 1, 1, 1, C.gold2); R(g, x - 2, y, 1, 1, C.gold3); };
    if (!side) { rib(cx - 13, hy - 4); rib(cx + 13, hy - 4); } else rib(cx - 9, hy - 3);
    return outline(c, C.ink);
  }
  const dollCache = new Map();
  function doll(view, red, mouth) {
    const key = view + (red ? 'r' : '') + (mouth || 0);
    if (!dollCache.has(key)) dollCache.set(key, buildDoll(view, { red, mouth }));
    return dollCache.get(key);
  }

  /* ---------------- guards ---------------- */
  function buildGuard(shape, flashOn) {
    const W = 30, H = 32, c = cnv(W, H), g = c.getContext('2d'), cx = 10;
    R(g, cx - 5, 26, 4, 5, C.steel2); R(g, cx + 1, 26, 4, 5, C.steel2);          // boots
    R(g, cx - 5, 19, 4, 7, C.navy); R(g, cx + 1, 19, 4, 7, C.navy);              // legs
    R(g, cx - 7, 9, 14, 11, C.navy3); R(g, cx - 7, 9, 2, 11, '#2f56a0'); R(g, cx + 4, 9, 3, 11, C.navy);
    R(g, cx - 7, 17, 14, 2, C.gold);                                             // belt
    R(g, cx - 9, 10, 3, 8, C.navy3); R(g, cx + 6, 10, 3, 6, C.navy3);           // arms
    // hood + mask
    disc(g, cx, 5, 5, C.navy3);
    ell(g, cx, 5, 4, 4, '#0a0a10');
    g.fillStyle = C.gold;
    if (shape === 'circle') { R(g, cx - 1, 3, 3, 1, C.gold); R(g, cx - 2, 4, 1, 3, C.gold); R(g, cx + 2, 4, 1, 3, C.gold); R(g, cx - 1, 7, 3, 1, C.gold); }
    else if (shape === 'triangle') { R(g, cx, 3, 1, 1, C.gold); R(g, cx - 1, 4, 1, 2, C.gold); R(g, cx + 1, 4, 1, 2, C.gold); R(g, cx - 2, 6, 5, 1, C.gold); }
    else { R(g, cx - 2, 3, 5, 1, C.gold); R(g, cx - 2, 7, 5, 1, C.gold); R(g, cx - 2, 4, 1, 3, C.gold); R(g, cx + 2, 4, 1, 3, C.gold); }
    // rifle pointing down-right toward the field
    line(g, cx - 6, 12, cx + 12, 20, C.steel); line(g, cx - 6, 13, cx + 12, 21, C.steel2); line(g, cx + 8, 18, cx + 15, 22, C.steel);
    R(g, cx - 8, 11, 3, 3, C.wood);
    if (flashOn) { R(g, cx + 15, 21, 3, 3, '#fff6b0'); R(g, cx + 18, 22, 2, 1, C.gold); R(g, cx + 16, 24, 1, 2, C.gold); R(g, cx + 16, 19, 1, 2, C.gold); }
    return outline(c, C.ink);
  }
  const guardCache = new Map();
  function guard(shape, flashOn, mirror) {
    const key = shape + (flashOn ? 'f' : '') + (mirror ? 'm' : '');
    if (!guardCache.has(key)) { let s = buildGuard(shape, flashOn); if (mirror) s = flipX(s); guardCache.set(key, s); }
    return guardCache.get(key);
  }

  /* pixelize an image (logo, crest) to a small size with hard alpha */
  function pixelImage(img, w, h, tint) {
    const c = cnv(w, h), g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const r = Math.min(w / img.naturalWidth, h / img.naturalHeight), dw = Math.round(img.naturalWidth * r), dh = Math.round(img.naturalHeight * r);
    g.drawImage(img, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2), dw, dh);
    const id = g.getImageData(0, 0, w, h), d = id.data, t = tint ? hex(tint) : null;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
      d[i + 3] = 255;
      if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; }
      else { d[i] = Math.round(d[i] / 24) * 24; d[i + 1] = Math.round(d[i + 1] / 24) * 24; d[i + 2] = Math.round(d[i + 2] / 24) * 24; }
    }
    g.putImageData(id, 0, 0); return c;
  }

  window.PX = { C, cnv, hash, rng, outline, recolor, grey, R, disc, ell, line, text, textW, textOutlined, fontClean, look, charSprite, doll, guard, pixelImage, flipX };
})();

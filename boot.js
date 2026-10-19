'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const touch = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  if (touch) { $('pickPlayer').classList.add('primary'); $('playerTag').textContent = 'RECOMMENDED ON PHONES'; }
  else { $('pickHost').classList.add('primary'); }
  // room code: the QR carries ?room=CODE so phones open straight into the join screen
  const params = new URLSearchParams(location.search);
  const urlRoom = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  let hostCode = null; try { hostCode = sessionStorage.getItem('step-rlgl-code'); } catch {}
  if (!hostCode) { hostCode = STEPNet.newCode(); try { sessionStorage.setItem('step-rlgl-code', hostCode); } catch {} }
  window.ROOM_CODE = hostCode;
  window.JOIN_URL = location.origin + location.pathname + '?room=' + hostCode;
  window.PHONE_ROOM = urlRoom;

  // ---- which game: 'squid' (Red Light, Green Light) or 'pirate' (All Aboard!)
  const urlGame = params.get('game') === 'pirate' ? 'pirate' : '';
  window.setGameTheme = function (id) {
    id = id === 'pirate' ? 'pirate' : 'squid';
    const changed = window.GAME_THEME !== id;
    window.GAME_THEME = id;
    document.body.classList.toggle('pirate', id === 'pirate');
    document.title = id === 'pirate' ? 'STEP All Aboard!' : 'STEP Red Light, Green Light';
    try { sessionStorage.setItem('step-rlgl-game', id); } catch {}
    if (changed && window.PhoneArena && PhoneArena.retheme) PhoneArena.retheme();
  };
  window.GAME_THEME = 'squid';
  // the two picture cards on the game picker
  try {
    const a = $('artSquid').getContext('2d'); a.drawImage(PX.doll('front', false, 0), 0, 0);
    const b = $('artPirate').getContext('2d'); b.drawImage(PXP.captain('front', false, false), 0, 0);
  } catch {}
  const showModes = () => { $('games').hidden = true; $('modes').hidden = false; };
  $('pickSquid').onclick = () => { setGameTheme('squid'); showModes(); };
  $('pickPirate').onclick = () => { setGameTheme('pirate'); showModes(); };
  $('changeGame').onclick = () => { $('modes').hidden = true; $('games').hidden = false; };

  let started = null;
  const remember = m => { try { sessionStorage.setItem('step-rlgl-mode', m); } catch {} };
  $('pickPlayer').onclick = () => { if (started) return; started = 'player'; remember('player'); $('modes').hidden = true; $('games').hidden = true; window.startPhone(); };
  $('pickHost').onclick = () => { if (started) return; started = 'host'; remember('host'); $('modes').hidden = true; $('games').hidden = true; startHostMode(); };
  $('modeBtn').onclick = () => { try { sessionStorage.removeItem('step-rlgl-mode'); } catch {} location.href = location.pathname; };

  const CTRL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + '-' + String.fromCharCode(159) + String.fromCharCode(0x200b) + '-' + String.fromCharCode(0x200f) + String.fromCharCode(0x202a) + '-' + String.fromCharCode(0x202e) + String.fromCharCode(0x2060) + '-' + String.fromCharCode(0x206f) + ']', 'g');
  const clean = s => String(s || '').replace(CTRL, '').trim().slice(0, 24) || 'Player';
  const short6 = n => String(n || '').replace(/^Bot\s+/, '').replace(/\s+/g, ' ').trim().slice(0, 6);
  const CODE = { ready: 'r', waiting: 'w', alive: 'a', out: 'o', won: 'x' };

  // teams and groups players can pick (teams come from teams.json)
  window.STEPGroups = {
    teams: ['POSTE', 'SINAG', 'HATTS', 'Zeoskin', 'CAPPS', 'BRICKS', 'meSHM', 'SFRSCC', 'SPArC', 'LASER'],
    others: ['Facilitator', 'Mentor', 'DOST'],
    check(t) { t = String(t || ''); return [...this.teams, ...this.others].find(x => x.toLowerCase() === t.toLowerCase()) || ''; },
    fill(sel) {
      if (!sel || sel.options.length > 1) return;
      const add = (label, list) => { const g = document.createElement('optgroup'); g.label = label; list.forEach(x => { const o = document.createElement('option'); o.value = x; o.textContent = x; g.appendChild(o); }); sel.appendChild(g); };
      add('STEP teams', this.teams); add('Others', this.others);
    }
  };
  fetch('teams.json').then(r => r.json()).then(list => { STEPGroups.teams = list.map(x => x.team); }).catch(() => {});
  STEPGroups.fill($('teamSel')); STEPGroups.fill($('localTeam'));

  function startHostMode() {
    $('hostApp').hidden = false;
    // the QR code opens the phones straight into this game
    window.JOIN_URL = location.origin + location.pathname + '?room=' + hostCode + (window.GAME_THEME === 'pirate' ? '&game=pirate' : '');
    const engine = new STEPEngine(m => window.hostOnMsg(m));
    window.startHost(engine);

    // ---- play from this screen (keyboard / on-screen button)
    const LOCAL = 'local-screen';
    try { $('localName').value = localStorage.getItem('step-rlgl-local') || ''; } catch {}
    $('localBtn').onclick = () => {
      const n = clean($('localName').value || 'Host');
      try { localStorage.setItem('step-rlgl-local', n); } catch {}
      const lg = document.querySelector('input[name="lgender"]:checked');
      if (engine.addPlayer(LOCAL, n, { local: true, gender: lg ? lg.value : 'm', team: STEPGroups.check($('localTeam').value) })) { $('localRow').classList.add('done'); $('localRow').querySelector('label').textContent = 'YOU ARE PLAYING AS ' + n.toUpperCase(); }
      engine.out(engine.state());
    };
    let kDown = false, pDown = new Set();
    const setLocal = () => engine.press(LOCAL, kDown || pDown.size > 0);
    addEventListener('keydown', e => { if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); if (!kDown) { kDown = true; setLocal(); } } });
    addEventListener('keyup', e => { if (e.code === 'Space') { kDown = false; setLocal(); } });
    addEventListener('blur', () => { kDown = false; pDown.clear(); setLocal(); });
    const lf = $('localFwd');
    lf.addEventListener('pointerdown', e => { e.preventDefault(); try { lf.setPointerCapture(e.pointerId); } catch {} pDown.add(e.pointerId); setLocal(); });
    const up = e => { pDown.delete(e.pointerId); setLocal(); };
    lf.addEventListener('pointerup', up); lf.addEventListener('pointercancel', up); lf.addEventListener('lostpointercapture', up);
    setInterval(() => {
      const me = engine.players.get(LOCAL);
      const show = !!me && me.status === 'alive' && ['countdown', 'green', 'turning', 'red', 'turnback'].includes(engine.phase);
      lf.hidden = !show; lf.classList.toggle('down', !!(me && me.pressing));
    }, 60);

    // ---- phones through Supabase Realtime
    const net = new STEPNet.HostNet(hostCode, {
      onJoin(pid, name, g, t) {
        const team = STEPGroups.check(t);
        let pl = engine.players.get(pid);
        if (!pl) engine.addPlayer(pid, clean(name), { gender: g, team });
        else { pl.connected = true; if (engine.phase === 'lobby' || engine.phase === 'ended') engine.rename(pid, clean(name), g, team); }
        engine.out(engine.state());
      },
      onPress(pid, down) { engine.press(pid, down); },
      onLeave(pid) { engine.setConnected(pid, false); engine.out(engine.state()); },
      onBack(pid) { const pl = engine.players.get(pid); if (pl) { pl.connected = true; engine.out(engine.state()); } },
      onStatus(ok) {
        $('roomNote').textContent = ok ? 'Scan with your phone camera and tap Join. No login needed.' : 'Connecting to the game server… check the internet connection.';
      }
    });
    net.start();
    $('roomCode').textContent = hostCode;
    let lastSent = 0, lastCrit = '', lastPos = '';
    setInterval(() => {
      const pl = {};
      let crit = engine.phase + '|' + (engine.phase === 'green' ? engine.phaseStart : '') + '|', pos = '';
      for (const p of engine.players.values()) {
        const prog = Math.round(Math.min(1, p.pos / engine.cfg.fieldLength) * 1000);
        // everyone on the field, so each phone can draw a mini map with its own runner marked
        pl[p.id] = [p.num, CODE[p.status] || 'r', prog, p.rank, Math.round(p.lane * 100), short6(p.name), p.gender];
        crit += p.id + p.status + p.num + p.gender + short6(p.name) + ';'; pos += prog + ',';
      }
      const st = { ph: engine.phase, mx: engine.cfg.maxPlayers, pl };
      if (window.GAME_THEME === 'pirate') st.gm = 'p';
      if (engine.phase === 'green') { st.gl = Math.max(0, Math.round(engine.phaseEnd - Date.now())); st.ln = (engine.phaseExtra && engine.phaseExtra.line) || 'full'; st.gk = engine.phaseStart; }
      if (engine.phase === 'ended' && engine.lastResult) st.pod = engine.lastResult.podium.map(w => [w.num, w.name, w.rank]);
      const now = Date.now(), gap = now - lastSent;
      // status/phase changes go out at once; positions ~3 times a second; a keep-alive every 2 s
      // with more than 20 players, positions go out a little less often so the live connection stays inside the free plan
      const posGap = engine.players.size > 20 ? 420 : 330;
      if ((crit !== lastCrit && gap >= 120) || (pos !== lastPos && gap >= posGap) || gap >= 2000) {
        lastCrit = crit; lastPos = pos; lastSent = now;
        net.sendState(st);
      }
    }, 60);
  }

  // reopen in the mode chosen before (e.g. after an update reload)
  let prev = null, prevGame = null; try { prev = sessionStorage.getItem('step-rlgl-mode'); prevGame = sessionStorage.getItem('step-rlgl-game'); } catch {}
  if (urlRoom) { setGameTheme(urlGame || 'squid'); $('pickPlayer').click(); }
  else if (prev === 'host' || prev === 'player') { setGameTheme(prevGame || 'squid'); $(prev === 'host' ? 'pickHost' : 'pickPlayer').click(); }
})();

/* Game rules — runs on the host screen and is the single authority.
   Same rules as the stand-alone server version. */
(function () {
  const CFG = {
    maxPlayers: 20, winnersCount: 3, fieldLength: 100, runSpeedPerSecond: 4.2,
    accelSeconds: 0.25, stopSeconds: 0.45,          // momentum: runners need a moment to stop
    countdownSeconds: 3, firstGreenMs: 3400, greenMinMs: 1600, greenMaxMs: 5200,   // green = how long her line takes
    turnMinMs: 250, turnMaxMs: 420, redMinMs: 2600, redMaxMs: 5000, turnBackMs: 450,
    networkGraceMs: 100, timeLimitSeconds: 0
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const now = () => Date.now();
  const BOT_NAMES = ['Bot Ana', 'Bot Ben', 'Bot Carla', 'Bot Dan', 'Bot Ela', 'Bot Fritz', 'Bot Gia', 'Bot Hugo', 'Bot Ivy', 'Bot Jun', 'Bot Kai', 'Bot Lia', 'Bot Migs', 'Bot Nina', 'Bot Oca', 'Bot Pia', 'Bot Quin', 'Bot Rey', 'Bot Sam', 'Bot Tess'];
  const PLAYING = ['green', 'turning', 'red', 'turnback'];

  class Engine {
    constructor(out) {
      this.cfg = CFG;
      this.out = out;                       // (msg) => void   — same messages the server used to send the host
      this.players = new Map();
      this.phase = 'lobby'; this.phaseStart = 0; this.phaseEnd = 0;
      this.roundStart = 0; this.cycle = 0; this.winners = []; this.over = false; this.endTimer = null; this.lastResult = null;
      this.epoch = 0;
      this.lastTick = now(); this.tickN = 0;
      setInterval(() => this.tick(), 33);
    }
    // ---------- players
    allocNum() { const used = new Set([...this.players.values()].map(p => p.num)); let n = 1; while (used.has(n)) n++; return n; }
    addPlayer(id, name, opts = {}) {
      if (this.players.has(id)) return this.players.get(id);
      if (this.players.size >= CFG.maxPlayers) return null;
      const p = { id, name: String(name || 'Player').slice(0, 24), num: this.allocNum(), bot: !!opts.bot, local: !!opts.local, team: String(opts.team || '').slice(0, 20), gender: opts.gender === 'f' ? 'f' : opts.gender === 'm' ? 'm' : (Math.random() < 0.5 ? 'f' : 'm'),
        connected: true, pressing: false, pos: 0, status: this.phase === 'lobby' || this.phase === 'ended' ? 'ready' : 'waiting',
        rank: 0, lane: 0.5, v: 0, skill: rand(0.25, 0.95), botTimer: null, botTimer2: null };
      this.players.set(id, p);
      this.out({ t: 'joined', id: p.id, num: p.num, name: p.name });
      return p;
    }
    rename(id, name, gender, team) { const p = this.players.get(id); if (!p) return; if (team) p.team = String(team).slice(0, 20); if (name) p.name = String(name).slice(0, 24); if (gender === 'f' || gender === 'm') p.gender = gender; }
    setConnected(id, c) {
      const p = this.players.get(id); if (!p) return;
      p.connected = c; if (!c) p.pressing = false;
      if (!c && (this.phase === 'lobby' || this.phase === 'ended')) this.players.delete(id);
    }
    remove(id) { this.players.delete(id); if (!['lobby', 'ended'].includes(this.phase)) this.checkEnd(); }
    pub(p) { return { id: p.id, num: p.num, name: p.name, pos: p.pos, status: p.status, rank: p.rank, pressing: p.pressing, moving: p.v > 0.02, gender: p.gender, team: p.team, connected: p.connected, bot: p.bot, local: p.local, lane: p.lane }; }
    state() {
      return { t: 'state', phase: this.phase, players: [...this.players.values()].map(p => this.pub(p)), winners: this.winners,
        winnersCount: CFG.winnersCount, fieldLength: CFG.fieldLength, maxPlayers: CFG.maxPlayers, timeLeft: this.timeLeft(), cycle: this.cycle };
    }
    timeLeft() {
      if (!CFG.timeLimitSeconds || !this.roundStart || ['lobby', 'ended', 'countdown'].includes(this.phase)) return null;
      return Math.max(0, CFG.timeLimitSeconds * 1000 - (now() - this.roundStart));
    }
    // ---------- flow
    setPhase(phase, ms, extra = {}) {
      this.phase = phase; this.phaseStart = now(); this.phaseEnd = ms ? this.phaseStart + ms : 0;
      this.out({ t: 'phase', phase, ms: ms || 0, ...extra });
      for (const p of this.players.values()) if (p.bot) this.botOnPhase(p, phase);
      this.out(this.state());
    }
    command(m) {
      switch (m.t) {
        case 'start': this.start(); break;
        case 'lobby': this.toLobby(); break;
        case 'end': if (!['lobby', 'ended'].includes(this.phase)) this.endGame(); break;
        case 'addBots': this.addBots(m.n || 5); break;
        case 'removeBots': for (const [id, p] of this.players) if (p.bot) this.players.delete(id); if (!['lobby', 'ended'].includes(this.phase)) this.checkEnd(); this.out(this.state()); break;
        case 'kick': this.remove(m.id); this.out(this.state()); break;
      }
    }
    start() {
      if (this.phase !== 'lobby' && this.phase !== 'ended') return;
      for (const [id, p] of this.players) if (!p.connected && !p.bot) this.players.delete(id);
      if (!this.players.size) return;
      clearTimeout(this.endTimer); this.endTimer = null;
      this.winners = []; this.cycle = 0; this.over = false; this.lastResult = null; this.epoch++;
      const list = [...this.players.values()].sort((a, b) => a.num - b.num);
      // random lanes every round, spread evenly so nobody is stuck on the far edge
      const slots = list.map((_, i) => (i + 0.5) / list.length);
      for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
      list.forEach((p, i) => { p.status = 'alive'; p.pos = 0; p.rank = 0; p.pressing = false; p.v = 0; p.lane = slots[i]; });
      this.setPhase('countdown', CFG.countdownSeconds * 1000);
    }
    toLobby() {
      clearTimeout(this.endTimer); this.endTimer = null;
      for (const [id, p] of this.players) if (!p.connected && !p.bot) this.players.delete(id);
      for (const p of this.players.values()) { p.status = 'ready'; p.pos = 0; p.rank = 0; p.pressing = false; }
      this.winners = []; this.roundStart = 0; this.over = false;
      this.setPhase('lobby');
    }
    eliminate(p, reason) {
      if (p.status !== 'alive' || this.over) return;
      p.status = 'out'; p.pressing = false; p.v = 0;
      this.out({ t: 'eliminated', id: p.id, num: p.num, name: p.name, reason: reason || 'moved' });
      this.checkEnd();
    }
    finish(p) {
      if (p.status !== 'alive' || this.over) return;
      p.status = 'won'; p.pressing = false; p.v = 0; p.pos = CFG.fieldLength;
      this.winners.push(p.id); p.rank = this.winners.length;
      this.out({ t: 'won', id: p.id, num: p.num, name: p.name, rank: p.rank });
      this.checkEnd();
    }
    checkEnd() {
      if (['ended', 'lobby'].includes(this.phase) || this.endTimer) return;
      const alive = [...this.players.values()].filter(p => p.status === 'alive');
      if (this.winners.length >= CFG.winnersCount || alive.length === 0) {
        this.over = true;
        for (const p of this.players.values()) { p.pressing = false; p.v = 0; }
        // the safe spots are taken: everyone still on the field is shot
        let left = 0;
        if (this.winners.length >= CFG.winnersCount) {
          const doomed = alive.sort((a, b) => b.pos - a.pos);
          left = doomed.length;
          setTimeout(() => {
            for (const p of doomed) {
              if (p.status !== 'alive') continue;
              p.status = 'out';
              this.out({ t: 'eliminated', id: p.id, num: p.num, name: p.name, reason: 'unsafe' });
            }
            this.out(this.state());
          }, 900);
        }
        this.endTimer = setTimeout(() => this.endGame(), 2400 + (left ? 900 + 2000 + left * 130 + 1500 : 0));   // leave time for the run-and-shoot animation
      }
    }
    endGame() {
      clearTimeout(this.endTimer); this.endTimer = null;
      const podium = this.winners.slice(0, CFG.winnersCount).map(id => this.players.get(id)).filter(Boolean)
        .map(p => ({ id: p.id, num: p.num, name: p.name, rank: p.rank, gender: p.gender, team: p.team }));
      const outCount = [...this.players.values()].filter(p => p.status === 'out').length;
      this.lastResult = { podium, outCount, total: this.players.size };
      this.over = true;
      this.setPhase('ended', 0, this.lastResult);
    }
    nextGreen(first) {
      this.cycle++;
      // she sometimes sings fast, sometimes slow — the turn comes right after the last word
      // ...and sometimes she only says a quick "Welcome!" before spinning round
      const r = Math.random();
      if (!first && r < 0.4) { this.setPhase('green', Math.round(rand(900, 1700)), { line: 'short' }); return; }
      const r2 = Math.random();
      const ms = first ? CFG.firstGreenMs : Math.round(r2 < 0.3 ? rand(CFG.greenMinMs, CFG.greenMinMs + 900) : r2 < 0.75 ? rand(2600, 3800) : rand(3800, CFG.greenMaxMs));
      this.setPhase('green', ms, { line: 'full' });
    }
    detecting() { return (this.phase === 'red' && now() - this.phaseStart >= CFG.networkGraceMs) || this.phase === 'turnback'; }
    press(id, down) {
      const p = this.players.get(id); if (!p) return;
      down = !!down;
      if (p.status !== 'alive' || this.over || !PLAYING.includes(this.phase)) { p.pressing = false; return; }
      p.pressing = down;
      if (down && this.detecting()) this.eliminate(p, 'moved');   // starting to move while she watches
    }
    // ---------- bots
    addBots(n) {
      const bots = [...this.players.values()].filter(p => p.bot).length;
      n = Math.min(n, CFG.maxPlayers - this.players.size);
      for (let i = 0; i < n; i++) {
        const used = new Set([...this.players.values()].map(p => p.name));
        const name = BOT_NAMES.find(b => !used.has(b)) || ('Bot ' + (this.players.size + 1));
        this.addPlayer('bot-' + Math.random().toString(36).slice(2, 9), name, { bot: true });
      }
      this.out(this.state());
    }
    botOnPhase(b, phase) {
      clearTimeout(b.botTimer);
      if (b.status !== 'alive') return;
      clearTimeout(b.botTimer2);
      if (phase === 'green') {
        b.botTimer = setTimeout(() => this.press(b.id, true), rand(150, 650));
        // careful bots stop near the end of her line
        if (b.skill > 0.55) b.botTimer2 = setTimeout(() => this.press(b.id, false), Math.max(300, (this.phaseEnd - Date.now()) - rand(80, 450)));
      } else if (phase === 'turning') b.botTimer = setTimeout(() => this.press(b.id, false), rand(60, 300) + (1 - b.skill) * rand(0, 700));
    }
    // ---------- tick
    tick() {
      const t = now(), dt = Math.min(0.1, (t - this.lastTick) / 1000);
      this.lastTick = t; this.tickN++;
      if (PLAYING.includes(this.phase) && !this.over) {
        if (this.phase === 'green' || this.phase === 'turning') {
        }
        for (const p of this.players.values()) {
          if (p.status !== 'alive') continue;
          const go = p.pressing;
          p.v = go ? Math.min(1, p.v + dt / CFG.accelSeconds) : Math.max(0, p.v - dt / CFG.stopSeconds);
          if (p.v > 0) { p.pos += CFG.runSpeedPerSecond * p.v * dt; if (p.pos >= CFG.fieldLength) { this.finish(p); continue; } }
        }
        if (this.detecting()) for (const p of this.players.values()) if (p.status === 'alive' && (p.pressing || p.v > 0.02)) this.eliminate(p, 'moved');
        if (this.timeLeft() === 0) for (const p of this.players.values()) if (p.status === 'alive') this.eliminate(p, 'time');
      }
      if (this.phaseEnd && t >= this.phaseEnd && !this.over) {
        switch (this.phase) {
          case 'countdown': this.roundStart = now(); this.nextGreen(true); break;
          case 'green': this.setPhase('turning', Math.round(rand(CFG.turnMinMs, CFG.turnMaxMs))); break;
          case 'turning': this.setPhase('red', Math.round(rand(CFG.redMinMs, CFG.redMaxMs))); break;
          case 'red': this.setPhase('turnback', CFG.turnBackMs); break;
          case 'turnback': this.nextGreen(false); break;
        }
      }
      if (this.tickN % 2 === 0) this.out(this.state());
    }
  }
  window.STEPEngine = Engine;
})();

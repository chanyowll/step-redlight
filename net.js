/* Live connection over Supabase Realtime (broadcast only, no database).
   Designed to stay inside the free plan (100 messages/second for the whole project):
   - one "game" channel: the big screen sends the game state ~3 times a second to every phone
   - one small "inbox" channel per phone: FORWARD presses and heartbeats go to the big screen only */
(function () {
  'use strict';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let client = null;
  function sb() {
    if (!client) {
      const c = window.STEP_CONFIG || {};
      client = window.supabase.createClient(c.supabaseUrl, c.supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 20 } }
      });
    }
    return client;
  }
  const chName = (code, part) => 'rlgl-' + code + '-' + part;
  const cleanId = s => String(s || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);

  function newCode() { let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
  function newId() { let s = ''; const a = 'abcdefghijkmnpqrstuvwxyz23456789'; for (let i = 0; i < 12; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

  /* ---------------- big screen ---------------- */
  class HostNet {
    constructor(code, h) { this.code = code; this.h = h; this.inbox = new Map(); this.connected = false; }
    start() {
      this.game = sb().channel(chName(this.code, 'game'), { config: { broadcast: { self: false } } });
      this.game.on('broadcast', { event: 'join' }, ({ payload }) => this._join(payload || {}));
      this.game.subscribe(status => {
        this.connected = status === 'SUBSCRIBED';
        if (this.h.onStatus) this.h.onStatus(this.connected, status);
      });
      this.sweep = setInterval(() => {
        const now = Date.now();
        for (const [pid, ib] of this.inbox) {
          if (!ib.gone && now - ib.last > 16000) { ib.gone = true; this.h.onLeave(pid); }
          if (ib.gone && now - ib.last > 600000) { try { sb().removeChannel(ib.ch); } catch {} this.inbox.delete(pid); }
        }
      }, 3000);
    }
    _join(p) {
      const pid = cleanId(p.pid); if (!pid) return;
      let ib = this.inbox.get(pid);
      if (!ib) {
        const ch = sb().channel(chName(this.code, 'p-' + pid), { config: { broadcast: { self: false } } });
        ib = { ch, last: Date.now() };
        const seen = () => { ib.last = Date.now(); if (ib.gone) { ib.gone = false; if (this.h.onBack) this.h.onBack(pid); } };
        ch.on('broadcast', { event: 'press' }, ({ payload }) => { seen(); this.h.onPress(pid, !!(payload && payload.d)); });
        ch.on('broadcast', { event: 'hb' }, seen);
        ch.subscribe();
        this.inbox.set(pid, ib);
      }
      ib.last = Date.now(); ib.gone = false;
      this.h.onJoin(pid, p.name, p.g, p.t);
    }
    sendState(st) { if (this.game && this.connected) this.game.send({ type: 'broadcast', event: 'st', payload: st }).catch(() => {}); }
  }

  /* ---------------- phone ---------------- */
  class PhoneNet {
    constructor(code, pid, h) { this.code = code; this.pid = pid; this.h = h; this.connected = false; this.me = null; this.inState = false; }
    start() {
      this.game = sb().channel(chName(this.code, 'game'), { config: { broadcast: { self: false } } });
      this.game.on('broadcast', { event: 'st' }, ({ payload }) => {
        if (!payload) return;
        this.inState = !!(payload.pl && payload.pl[this.pid]);
        this.lastState = Date.now();
        this.h.onState(payload);
      });
      this.game.subscribe(status => {
        this.connected = status === 'SUBSCRIBED';
        if (this.h.onStatus) this.h.onStatus(this.connected, status);
        if (this.connected && this.me) this._sendJoin();
      });
      this.inbox = sb().channel(chName(this.code, 'p-' + this.pid), { config: { broadcast: { self: false } } });
      this.inbox.subscribe();
      // keep announcing until the big screen lists us; heartbeat so it knows we are still here
      this.timer = setInterval(() => {
        if (!this.me) return;
        if (!this.inState) this._sendJoin();
        this.inbox.send({ type: 'broadcast', event: 'hb', payload: {} }).catch(() => {});
      }, 5000);
    }
    join(name, g, t) { this.me = { name, g, t }; this._sendJoin(); }
    _sendJoin() { if (this.connected && this.me) this.game.send({ type: 'broadcast', event: 'join', payload: { pid: this.pid, name: this.me.name, g: this.me.g, t: this.me.t } }).catch(() => {}); }
    press(down) { if (this.inbox) this.inbox.send({ type: 'broadcast', event: 'press', payload: { d: down ? 1 : 0 } }).catch(() => {}); }
  }

  window.STEPNet = { HostNet, PhoneNet, newCode, newId };
})();

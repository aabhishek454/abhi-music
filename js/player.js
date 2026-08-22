/* ABHI MUSIC — Playback Engine + State */

const PlayerState = {
  queue: [],
  index: -1,
  playing: false,
  shuffle: false,
  repeat: 'off', // off | all | one
  volume: 0.85,
  muted: false,
  liked: new Set(JSON.parse(localStorage.getItem('abhi_liked') || '[]')),
  recent: JSON.parse(localStorage.getItem('abhi_recent') || '[]'),
};

const AudioEngine = {
  el: null,
  init() {
    // Simulated playback engine (swap in a real <audio> element when tracks have src URLs)
  },
};

const Player = {
  playTrack(id, context = []) {
    if (context.length) {
      PlayerState.queue = [...context];
      PlayerState.index = context.indexOf(id);
      if (PlayerState.index < 0) { PlayerState.queue.unshift(id); PlayerState.index = 0; }
    } else if (!PlayerState.queue.includes(id)) {
      PlayerState.queue.push(id);
      PlayerState.index = PlayerState.queue.length - 1;
    } else {
      PlayerState.index = PlayerState.queue.indexOf(id);
    }
    this.load(PlayerState.queue[PlayerState.index]);
  },

  load(id) {
    const t = MusicService.getTrack(id);
    if (!t) return;
    this._simulate(t);
    Player.addRecent(id);
    UI.renderPlayer();
    UI.renderQueue();
    UI.applyAmbient(t);
    document.title = `${t.title} · ${t.artist} — ABHI MUSIC`;
  },

  _simulate(t) {
    clearInterval(this._sim);
    this._pos = 0;
    this._sim = setInterval(() => {
      if (!PlayerState.playing) return;
      this._pos += 0.25;
      if (this._pos >= t.dur) { Player.next(); return; }
      UI.onTime(this._pos, t.dur);
    }, 250);
  },
  seek(frac) {
    const t = MusicService.getTrack(this.current());
    if (!t) return;
    this._pos = frac * t.dur;
    UI.onTime(this._pos, t.dur);
  },
  current: () => PlayerState.queue[PlayerState.index],

  toggle() {
    if (!this.current()) { // start with trending
      const t = MusicService.trending();
      this.playTrack(t[0].id, t.map(x=>x.id));
      return;
    }
    PlayerState.playing = !PlayerState.playing;
    UI.onPlayState();
  },
  next() {
    if (!PlayerState.queue.length) return;
    if (PlayerState.repeat === 'one') { this._pos = 0; return; }
    if (PlayerState.shuffle) {
      let n; do { n = Math.floor(Math.random()*PlayerState.queue.length); } while (n === PlayerState.index && PlayerState.queue.length > 1);
      PlayerState.index = n;
    } else {
      PlayerState.index++;
      if (PlayerState.index >= PlayerState.queue.length) {
        if (PlayerState.repeat === 'all') PlayerState.index = 0;
        else { PlayerState.index = PlayerState.queue.length-1; PlayerState.playing = false; UI.onPlayState(); return; }
      }
    }
    this.load(PlayerState.queue[PlayerState.index]);
  },
  prev() {
    if (!PlayerState.queue.length) return;
    if (this._pos > 4) { this.seek(0); return; }
    PlayerState.index = (PlayerState.index - 1 + PlayerState.queue.length) % PlayerState.queue.length;
    this.load(PlayerState.queue[PlayerState.index]);
  },
  setShuffle() { PlayerState.shuffle = !PlayerState.shuffle; UI.syncControls(); UI.toast(PlayerState.shuffle ? 'Shuffle on' : 'Shuffle off'); },
  cycleRepeat() {
    PlayerState.repeat = { off:'all', all:'one', one:'off' }[PlayerState.repeat];
    UI.syncControls(); UI.toast(`Repeat: ${PlayerState.repeat}`);
  },
  setVolume(v) {
    PlayerState.volume = Math.min(1, Math.max(0, v));
    PlayerState.muted = PlayerState.volume === 0;
    UI.syncControls();
  },
  toggleMute() { PlayerState.muted = !PlayerState.muted; UI.syncControls(); },

  toggleLike(id) {
    const s = PlayerState.liked;
    s.has(id) ? s.delete(id) : s.add(id);
    localStorage.setItem('abhi_liked', JSON.stringify([...s]));
    UI.syncLikes();
    UI.toast(s.has(id) ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  },

  addRecent(id) {
    const r = PlayerState.recent.filter(x => x !== id);
    r.unshift(id);
    PlayerState.recent = r.slice(0, 12);
    localStorage.setItem('abhi_recent', JSON.stringify(PlayerState.recent));
  },

  playContext(trackIds, shuffle = false) {
    PlayerState.shuffle = shuffle;
    const ids = shuffle ? [...trackIds].sort(() => Math.random()-.5) : trackIds;
    PlayerState.queue = [...ids];
    PlayerState.index = 0;
    this.load(ids[0]);
    PlayerState.playing = true;
    UI.onPlayState();
  },

  addToQueue(id) {
    if (PlayerState.queue.includes(id)) return UI.toast('Already in queue');
    PlayerState.queue.push(id);
    UI.renderQueue();
    UI.toast('Added to queue');
  },
  playNext(id) {
    PlayerState.queue.splice(PlayerState.index + 1, 0, id);
    UI.renderQueue();
    UI.toast('Playing next');
  },
  removeFromQueue(idx) {
    if (idx === PlayerState.index) return;
    PlayerState.queue.splice(idx, 1);
    if (idx < PlayerState.index) PlayerState.index--;
    UI.renderQueue();
  },
  clearQueue() {
    const cur = this.current();
    PlayerState.queue = cur ? [cur] : [];
    PlayerState.index = cur ? 0 : -1;
    UI.renderQueue();
    UI.toast('Queue cleared');
  },
};
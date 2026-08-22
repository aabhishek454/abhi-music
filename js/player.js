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
    this.el = new window.Audio();
    this.el.volume = PlayerState.volume;
    this.el.preload = 'auto';
    this.el.addEventListener('timeupdate', () => UI.onTime(this.el.currentTime, this.el.duration));
    this.el.addEventListener('ended', () => Player.next());
    this.el.addEventListener('play',  () => { PlayerState.playing = true; UI.onPlayState(); });
    this.el.addEventListener('pause', () => { PlayerState.playing = false; UI.onPlayState(); });
    this.el.addEventListener('error', () => {
      if (!this.el.src || this._failing === this.el.src) return;
      this._failing = this.el.src;
      UI.toast('Preview unavailable — skipping…');
      setTimeout(() => Player.next(), 400);
    });
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
    clearInterval(this._sim);
    if (t.youtubeId) {
      // Full song via YouTube IFrame API
      PlayerState.playing = true;
      UI.onPlayState();
      playViaYouTube(t.youtubeId, state => {
        if (state === 0) Player.next();               // ended
        if (state === 1) { PlayerState.playing = true; UI.onPlayState(); }
        if (state === 2) { PlayerState.playing = false; UI.onPlayState(); }
      }).then(ok => { if (!ok) { UI.toast('YouTube unavailable — trying preview…'); this._playPreview(t); } });
      this._ytTick(t);
    } else if (t.preview || t.src) {
      this._playPreview(t);
    } else {
      this._simulate(t); // fallback for local demo tracks
      PlayerState.playing = true;
    }
    Player.addRecent(id);
    UI.renderPlayer();
    UI.renderQueue();
    UI.renderMini();
    UI.applyAmbient(t);
    document.title = `${t.title} · ${t.artist} — ABHI MUSIC`;
  },

  _playPreview(t) {
    AudioEngine.el.src = t.preview || t.src;
    AudioEngine.el.play().catch(() => { PlayerState.playing = true; UI.onPlayState(); });
  },

  _ytTick(t) {
    // progress from YT player
    clearInterval(this._ytTimer);
    this._ytTimer = setInterval(() => {
      if (!PlayerState.playing || !_ytPlayer || !_ytPlayer.getCurrentTime) return;
      try {
        UI.onTime(_ytPlayer.getCurrentTime(), _ytPlayer.getDuration() || t.dur);
      } catch {}
    }, 500);
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
    if (AudioEngine.el && AudioEngine.el.src && isFinite(AudioEngine.el.duration)) {
      AudioEngine.el.currentTime = frac * AudioEngine.el.duration;
    } else {
      this._pos = frac * t.dur;
      UI.onTime(this._pos, t.dur);
    }
  },
  current: () => PlayerState.queue[PlayerState.index],

  toggle() {
    if (!this.current()) { // start with trending
      const t = MusicService.trending();
      this.playTrack(t[0].id, t.map(x=>x.id));
      return;
    }
    if (AudioEngine.el && AudioEngine.el.src) {
      PlayerState.playing ? AudioEngine.el.pause() : AudioEngine.el.play().catch(()=>{});
    } else if (_ytPlayer && _ytPlayer.getPlayerState) {
      try {
        const s = _ytPlayer.getPlayerState();
        (s === 1) ? _ytPlayer.pauseVideo() : _ytPlayer.playVideo();
      } catch {}
    } else {
      PlayerState.playing = !PlayerState.playing;
    }
    UI.onPlayState();
  },
  next() {
    if (!PlayerState.queue.length) return;
    if (PlayerState.repeat === 'one') { if (AudioEngine.el) { AudioEngine.el.currentTime = 0; AudioEngine.el.play().catch(()=>{}); } return; }
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
    const cur = AudioEngine.el && AudioEngine.el.duration ? AudioEngine.el.currentTime : (this._pos||0);
    if (cur > 4) {
      if (AudioEngine.el && AudioEngine.el.src) AudioEngine.el.currentTime = 0; else this.seek(0);
      return;
    }
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
    if (AudioEngine.el) AudioEngine.el.volume = PlayerState.muted ? 0 : PlayerState.volume;
    UI.syncControls();
  },
  toggleMute() {
    PlayerState.muted = !PlayerState.muted;
    if (AudioEngine.el) AudioEngine.el.volume = PlayerState.muted ? 0 : PlayerState.volume;
    UI.syncControls();
  },

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
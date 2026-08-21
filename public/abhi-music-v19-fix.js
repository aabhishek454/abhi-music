/* Abhi Music v1.9.3 — APK playback fix: no audio-focus steal + mini play-first + Spotify BG */
(function () {
  'use strict';

  var bgArmed = false;
  var lastBgTs = 0;

  function absUrl(u) {
    try {
      if (!u || u === '#' || String(u).startsWith('blob:')) return null;
      return new URL(u, location.origin).href;
    } catch (e) {
      return null;
    }
  }
  /* Prefer native MediaPlayer for direct/preview URLs (not YouTube). */
  function canNative(t) {
    if (!window.AbhiAndroid || !t) return false;
    if (t.source === 'youtube') return false;
    if (t.source === 'direct' && absUrl(t.preview)) return true;
    /* legal preview clips that are real audio files */
    var p = absUrl(t.preview);
    if (!p) return false;
    if (/\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(p)) return true;
    if (p.indexOf('/music/') >= 0) return true;
    return false;
  }
  function isYT() {
    return !!(typeof state !== 'undefined' && state && state.current && state.current.source === 'youtube');
  }
  function $q(s) {
    return document.querySelector(s);
  }
  function isActuallyPlaying() {
    try {
      if (isYT() && typeof ytReady !== 'undefined' && ytReady && ytPlayer) {
        var st = ytPlayer.getPlayerState();
        return st === 1 || st === 3; /* PLAYING or BUFFERING */
      }
      if (canNative(state && state.current) && typeof nativePlaying !== 'undefined') return !!nativePlaying;
      if (typeof audio !== 'undefined' && audio && !audio.paused && !audio.ended) return true;
      if (typeof playbackActive !== 'undefined' && playbackActive) return true;
    } catch (e) {}
    return false;
  }
  function trackMeta() {
    var t = state && state.current;
    if (!t) return { title: 'Abhi Music', artist: 'Playing', artwork: '' };
    return {
      title: t.title || 'Abhi Music',
      artist: t.artist || 'Abhi Music',
      artwork: t.artwork || ''
    };
  }

  /* Spotify-style keep-alive notification. Native side must NOT request audio focus. */
  function startSpotifyBg() {
    if (!window.AbhiAndroid) return;
    var now = Date.now();
    if (bgArmed && now - lastBgTs < 2500) {
      /* throttle — just refresh metadata */
      try {
        var m0 = trackMeta();
        if (typeof window.AbhiAndroid.updateBackground === 'function') {
          window.AbhiAndroid.updateBackground(true, m0.title, m0.artist);
        }
      } catch (e) {}
      return;
    }
    var m = trackMeta();
    try {
      if (typeof window.AbhiAndroid.startBackground === 'function') {
        window.AbhiAndroid.startBackground(m.title, m.artist, m.artwork);
        bgArmed = true;
        lastBgTs = now;
      } else {
        try { window.AbhiAndroid.setVideoActive(true); } catch (e) {}
      }
    } catch (e) {}
  }
  function updateSpotifyBg(playing) {
    if (!window.AbhiAndroid) return;
    var m = trackMeta();
    try {
      if (typeof window.AbhiAndroid.updateBackground === 'function') {
        window.AbhiAndroid.updateBackground(!!playing, m.title, m.artist);
      }
      if (!playing) bgArmed = false;
      else { bgArmed = true; lastBgTs = Date.now(); }
    } catch (e) {}
  }
  function stopSpotifyBg() {
    if (!window.AbhiAndroid) return;
    bgArmed = false;
    try {
      if (typeof window.AbhiAndroid.stopBackground === 'function') {
        window.AbhiAndroid.stopBackground();
      } else {
        try { window.AbhiAndroid.setVideoActive(false); } catch (e) {}
      }
    } catch (e) {}
  }

  window.__abhiOnBackground = function () {
    if (isActuallyPlaying()) startSpotifyBg();
  };

  /* Lock-screen / notification commands from PlaybackService */
  var _prevNative = window.onAbhiNativeState;
  window.onAbhiNativeState = function (payload) {
    try {
      var s = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (s && s.command === 'next') {
        try { if (typeof next === 'function') next(); } catch (e) {}
        return;
      }
      if (s && s.command === 'previous') {
        try { if (typeof prev === 'function') prev(); } catch (e) {}
        return;
      }
      if (s && s.command === 'pause') {
        try {
          if (isYT() && ytReady && ytPlayer) ytPlayer.pauseVideo();
          else if (typeof audio !== 'undefined' && audio) audio.pause();
        } catch (e) {}
        updateSpotifyBg(false);
      }
      if (s && s.command === 'resume') {
        try {
          if (isYT() && ytReady && ytPlayer) ytPlayer.playVideo();
          else if (typeof audio !== 'undefined' && audio) audio.play().catch(function () {});
        } catch (e) {}
        startSpotifyBg();
      }
      if (s && typeof s.playing === 'boolean' && typeof nativePlaying !== 'undefined') {
        /* native direct tracks report state via core handler */
      }
    } catch (e) {}
    if (typeof _prevNative === 'function') {
      try { _prevNative(payload); } catch (e) {}
    }
  };

  /* 1) Close full player — NEVER pause */
  window.closeFullPlayer = function () {
    var fp = $q('#fullPlayer');
    if (fp) {
      fp.classList.remove('open');
      fp.setAttribute('aria-hidden', 'true');
    }
    /* keep playing; arm background session */
    if (isActuallyPlaying()) startSpotifyBg();
  };

  /* 2) playTrack — no forced full window; start audio first */
  window.playTrack = function (t, source) {
    if (!t) return;
    if (source && Array.isArray(source)) {
      var idx = source.findIndex(function (x) { return x.id === t.id; });
      if (idx >= 0) state.queue = source.slice(idx + 1).concat(source.slice(0, idx));
    }
    state.current = t;
    try { recordPlay(t); } catch (e) {}
    try { activeLyrics = []; } catch (e) {}
    try { maybePreviewTip(t); } catch (e) {}

    if (t.source === 'youtube') {
      try { audio.pause(); audio.removeAttribute('src'); } catch (e) {}
      if (window.AbhiAndroid) {
        try { window.AbhiAndroid.setVideoActive(true); } catch (e) {}
      }
      var dock = $q('#videoDock');
      if (dock) dock.classList.add('visible');
      /* Do NOT open full player. Do NOT start FGS until YT actually plays
         (setPlayIcon / onStateChange will arm BG). Avoid racing audio. */
      (function start() {
        if (typeof ytReady !== 'undefined' && ytReady && ytPlayer) {
          try {
            ytPlayer.loadVideoById(t.youtubeId);
            /* slight delay so WebView media session settles before any native bridge */
            setTimeout(function () {
              try { ytPlayer.playVideo(); } catch (e) {}
              /* arm BG after play request — native no longer steals focus */
              setTimeout(function () {
                if (isActuallyPlaying() || true) startSpotifyBg();
              }, 400);
            }, 80);
          } catch (e) {
            try { ytPlayer.loadVideoById(t.youtubeId); } catch (e2) {}
          }
        } else setTimeout(start, 180);
      })();
    } else {
      try {
        if (typeof ytReady !== 'undefined' && ytReady && ytPlayer) ytPlayer.stopVideo();
      } catch (e) {}
      var dock2 = $q('#videoDock');
      if (dock2) dock2.classList.remove('visible');
      if (window.AbhiAndroid) {
        try { window.AbhiAndroid.setVideoActive(false); } catch (e) {}
      }
      if (canNative(t)) {
        try { audio.pause(); audio.removeAttribute('src'); } catch (e) {}
        try {
          var url = absUrl(t.preview);
          if (!url) throw new Error('no url');
          window.AbhiAndroid.play(url, t.title || '', t.artist || '', t.artwork || '');
          try { toast('Playing in background'); } catch (e) {}
          bgArmed = true;
        } catch (e) {
          audio.src = t.preview;
          audio.play().catch(function () {});
          startSpotifyBg();
        }
      } else {
        var src = absUrl(t.preview) || t.preview;
        audio.src = src;
        var p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(function () { startSpotifyBg(); })
           .catch(function () {
             try { toast('Tap play on the mini player'); } catch (e) {}
           });
        } else {
          startSpotifyBg();
        }
      }
    }
    state.recent = [t].concat(state.recent.filter(function (x) {
      return x.id !== t.id;
    })).slice(0, 30);
    try {
      persist();
      updatePlayer();
      renderQueue();
      renderCurrentRows();
    } catch (e) {}
  };

  /* 3) togglePlayback — never open full */
  window.togglePlayback = function () {
    if (!state || !state.current) {
      if (state && state.hero) return playTrack(state.hero, state.tracks);
      return;
    }
    if (isYT()) {
      if (typeof ytReady === 'undefined' || !ytReady || !ytPlayer) {
        try { toast('Loading player…'); } catch (e) {}
        return;
      }
      var dock = $q('#videoDock');
      if (dock) dock.classList.add('visible');
      try {
        var st = ytPlayer.getPlayerState();
        if (st === 1) {
          ytPlayer.pauseVideo();
          updateSpotifyBg(false);
        } else {
          ytPlayer.playVideo();
          setTimeout(startSpotifyBg, 200);
        }
      } catch (e) {
        try { ytPlayer.playVideo(); setTimeout(startSpotifyBg, 200); } catch (e2) {}
      }
    } else if (canNative(state.current)) {
      try {
        if (typeof nativePlaying !== 'undefined' && nativePlaying) window.AbhiAndroid.pause();
        else window.AbhiAndroid.resume();
      } catch (e) {
        try {
          window.AbhiAndroid.play(
            absUrl(state.current.preview),
            state.current.title || '',
            state.current.artist || '',
            state.current.artwork || ''
          );
        } catch (e2) {}
      }
    } else {
      try {
        if (audio.paused) {
          audio.play().catch(function () {});
          startSpotifyBg();
        } else {
          audio.pause();
          updateSpotifyBg(false);
        }
      } catch (e) {}
    }
  };

  /* 4) Mini player bindings — cover opens full; play toggles only */
  function onMiniCover(e) {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    } catch (err) {}
    if (!state || !state.current) return;
    /* play first if stopped; open full only when already playing */
    if (!isActuallyPlaying()) togglePlayback();
    else {
      try {
        if (typeof openFullPlayer === 'function') openFullPlayer();
        else {
          var fp = $q('#fullPlayer');
          if (fp) { fp.classList.add('open'); fp.setAttribute('aria-hidden', 'false'); }
        }
      } catch (e3) {}
    }
  }
  function onPlayOnly(e) {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
    } catch (e2) {}
    togglePlayback();
  }
  function bindOne(el, fn) {
    if (!el) return;
    el.onclick = fn;
    el.ontouchend = function (ev) {
      try { ev.preventDefault(); } catch (e) {}
      fn(ev);
    };
  }
  function bindMini() {
    var img = $q('#playerImg');
    var cover = img && img.parentElement;
    var title = $q('#playerTitle');
    var meta = title && title.parentElement;
    var artist = $q('#playerArtist');
    var play = $q('#playBtn');
    var fullPlay = $q('#fullPlay');
    var close = $q('#closeFullPlayer');
    bindOne(cover, onMiniCover);
    bindOne(meta, onMiniCover);
    bindOne(artist, onMiniCover);
    bindOne(play, onPlayOnly);
    bindOne(fullPlay, onPlayOnly);
    if (close) {
      close.onclick = closeFullPlayer;
      close.ontouchend = function () { closeFullPlayer(); };
    }
  }
  bindMini();
  setTimeout(bindMini, 300);
  setTimeout(bindMini, 800);
  setTimeout(bindMini, 1600);
  setTimeout(bindMini, 3000);
  setTimeout(bindMini, 6000);
  var rebindN = 0;
  var rebindIv = setInterval(function () {
    bindMini();
    rebindN++;
    if (rebindN > 20) clearInterval(rebindIv);
  }, 1500);

  /* 5) Visibility → keep Spotify-style BG */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (isActuallyPlaying()) startSpotifyBg();
    } else {
      if (isActuallyPlaying()) updateSpotifyBg(true);
      else stopSpotifyBg();
    }
  });
  window.addEventListener('pagehide', function () {
    if (isActuallyPlaying()) startSpotifyBg();
  });

  var pipBtn = $q('#pipBtn');
  if (pipBtn) {
    pipBtn.onclick = function () {
      startSpotifyBg();
      try { toast('Background play on · like Spotify'); } catch (e) {}
    };
    try {
      pipBtn.innerHTML = '<b>◉</b> BG';
      pipBtn.setAttribute('title', 'Background play');
    } catch (e) {}
  }

  /* Keep FGS alive while playing */
  setInterval(function () {
    if (!window.AbhiAndroid) return;
    if (!isActuallyPlaying()) return;
    try { updateSpotifyBg(true); } catch (e) {}
  }, 15000);

  /* Mirror core setPlayIcon → native session (only after real play) */
  try {
    var _setPlayIcon = window.setPlayIcon;
    if (typeof setPlayIcon === 'function') {
      window.setPlayIcon = function (playing) {
        try { if (typeof _setPlayIcon === 'function') _setPlayIcon(playing); } catch (e) {
          try { playbackActive = !!playing; } catch (e2) {}
        }
        if (playing) startSpotifyBg();
        else updateSpotifyBg(false);
      };
    }
  } catch (e) {}

  /* Safety: if YT errors, surface toast (core already does) and try next */
  window.__ABHI_V193 = true;
  try { console.info('Abhi Music v1.9.3 APK playback fix loaded'); } catch (e) {}
})();

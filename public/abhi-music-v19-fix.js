/* Abhi Music v1.9.2 — Spotify-style background (no PiP) + mini-player play-first */
(function () {
  'use strict';

  function absUrl(u) {
    try {
      if (!u || u === '#' || String(u).startsWith('blob:')) return null;
      return new URL(u, location.origin).href;
    } catch (e) {
      return null;
    }
  }
  function canNative(t) {
    return !!(window.AbhiAndroid && t && t.source !== 'youtube' && absUrl(t.preview));
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
        return st === 1 || st === 3;
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

  function startSpotifyBg() {
    if (!window.AbhiAndroid) return;
    var m = trackMeta();
    try {
      if (typeof window.AbhiAndroid.startBackground === 'function') {
        window.AbhiAndroid.startBackground(m.title, m.artist, m.artwork);
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
    } catch (e) {}
  }
  function stopSpotifyBg() {
    if (!window.AbhiAndroid) return;
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

  var _prevNative = window.onAbhiNativeState;
  window.onAbhiNativeState = function (payload) {
    try {
      var s = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (s && s.command) {
        if (s.command === 'pause') {
          if (isYT() && ytReady && ytPlayer) try { ytPlayer.pauseVideo(); } catch (e) {}
          else if (typeof audio !== 'undefined' && audio && !audio.paused) try { audio.pause(); } catch (e) {}
          updateSpotifyBg(false);
        } else if (s.command === 'resume' || s.command === 'play') {
          if (isYT() && ytReady && ytPlayer) try { ytPlayer.playVideo(); } catch (e) {}
          else if (typeof audio !== 'undefined' && audio) try { audio.play(); } catch (e) {}
          updateSpotifyBg(true);
        } else if (s.command === 'next') {
          try { if (typeof next === 'function') next(); } catch (e) {}
        } else if (s.command === 'previous') {
          try { if (typeof prev === 'function') prev(); } catch (e) {}
        }
      }
    } catch (e) {}
    if (typeof _prevNative === 'function') {
      try { _prevNative(payload); } catch (e) {}
    }
  };

  window.closeFullPlayer = function () {
    var fp = $q('#fullPlayer');
    if (fp) {
      fp.classList.remove('open');
      fp.setAttribute('aria-hidden', 'true');
    }
  };

  window.openFullPlayer = function () {
    if (!state || !state.current) return;
    var fp = $q('#fullPlayer');
    if (fp) {
      fp.classList.add('open');
      fp.setAttribute('aria-hidden', 'false');
    }
  };

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
      (function start() {
        if (typeof ytReady !== 'undefined' && ytReady && ytPlayer) {
          try {
            ytPlayer.loadVideoById(t.youtubeId);
            ytPlayer.playVideo();
          } catch (e) {
            try { ytPlayer.loadVideoById(t.youtubeId); } catch (e2) {}
          }
          startSpotifyBg();
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
          window.AbhiAndroid.play(absUrl(t.preview), t.title || '', t.artist || '', t.artwork || '');
          try { toast('Background play on'); } catch (e) {}
        } catch (e) {
          audio.src = t.preview;
          audio.play().catch(function () {});
          startSpotifyBg();
        }
      } else {
        audio.src = t.preview;
        audio.play().catch(function () {
          try { toast('Tap play on the mini player'); } catch (e) {}
        });
        startSpotifyBg();
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
          startSpotifyBg();
        }
      } catch (e) {
        try { ytPlayer.playVideo(); startSpotifyBg(); } catch (e2) {}
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

  function onMiniCover(e) {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    } catch (err) {}
    if (!state || !state.current) return;
    if (!isActuallyPlaying()) togglePlayback();
    else openFullPlayer();
  }
  function onPlayOnly(e) {
    try {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      }
    } catch (err) {}
    togglePlayback();
  }
  function bindOne(el, handler) {
    if (!el) return;
    try {
      el.onclick = handler;
      el.ontouchend = function (ev) {
        if (el.__abhiTouchLock) return;
        el.__abhiTouchLock = true;
        setTimeout(function () { el.__abhiTouchLock = false; }, 320);
        handler(ev);
      };
    } catch (e) {}
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

  setInterval(function () {
    if (!window.AbhiAndroid) return;
    if (!isActuallyPlaying()) return;
    try { updateSpotifyBg(true); } catch (e) {}
  }, 12000);

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

  window.__ABHI_V192 = true;
  try { console.info('Abhi Music v1.9.2 Spotify-style background (no PiP) loaded'); } catch (e) {}
})();

/* Abhi Music v1.9.1 — mini-player plays instantly (no full window) + true background play */
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
        return st === 1 || st === 3; /* PLAYING or BUFFERING */
      }
      if (canNative(state && state.current) && typeof nativePlaying !== 'undefined') return !!nativePlaying;
      if (typeof audio !== 'undefined' && audio && !audio.paused && !audio.ended) return true;
      if (typeof playbackActive !== 'undefined' && playbackActive) return true;
    } catch (e) {}
    return false;
  }

  /* 1) Close full player — NEVER pause / stop music (background continues) */
  window.closeFullPlayer = function () {
    var fp = $q('#fullPlayer');
    if (fp) {
      fp.classList.remove('open');
      fp.setAttribute('aria-hidden', 'true');
    }
  };

  /* Keep a clean open that only opens (no side effects) */
  window.openFullPlayer = function () {
    if (!state || !state.current) return;
    var fp = $q('#fullPlayer');
    if (fp) {
      fp.classList.add('open');
      fp.setAttribute('aria-hidden', 'false');
    }
  };

  /* 2) playTrack — start music WITHOUT forcing full-screen window */
  window.playTrack = function (t, source) {
    if (!t) return;
    if (source && Array.isArray(source)) {
      var idx = source.findIndex(function (x) {
        return x.id === t.id;
      });
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
      /* DO NOT open full player — mini plays immediately */
      (function start() {
        if (typeof ytReady !== 'undefined' && ytReady && ytPlayer) {
          try {
            ytPlayer.loadVideoById(t.youtubeId);
            ytPlayer.playVideo();
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
          window.AbhiAndroid.play(absUrl(t.preview), t.title || '', t.artist || '', t.artwork || '');
          try { toast('Background play on'); } catch (e) {}
        } catch (e) {
          audio.src = t.preview;
          audio.play().catch(function () {});
        }
      } else {
        audio.src = t.preview;
        audio.play().catch(function () {
          try { toast('Tap play on the mini player'); } catch (e) {}
        });
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

  /* 3) togglePlayback — pure play/pause. NEVER open full window */
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
      if (window.AbhiAndroid) {
        try { window.AbhiAndroid.setVideoActive(true); } catch (e) {}
      }
      try {
        var st = ytPlayer.getPlayerState();
        if (st === 1) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
      } catch (e) {
        try { ytPlayer.playVideo(); } catch (e2) {}
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
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
      } catch (e) {}
    }
  };

  /* 4) Mini-player UX
     - Play button: ALWAYS only play/pause (never open full)
     - Cover / title / artist: if not playing → play; if already playing → open full
     Rebind aggressively so core script cannot win. */
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
    var playerBar = $q('#player');

    bindOne(cover, onMiniCover);
    bindOne(meta, onMiniCover);
    bindOne(artist, onMiniCover);
    bindOne(play, onPlayOnly);
    bindOne(fullPlay, onPlayOnly);
    if (close) {
      close.onclick = closeFullPlayer;
      close.ontouchend = function () { closeFullPlayer(); };
    }

    if (playerBar && !playerBar.__abhiShield) {
      playerBar.__abhiShield = true;
      playerBar.addEventListener(
        'click',
        function (ev) {
          var t = ev.target;
          if (t && t.closest && t.closest('#playBtn')) {
            /* play only — no open */
          }
        },
        true
      );
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

  /* 5) Background: auto PiP for YouTube when app hides */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) return;
    if (isYT() && isActuallyPlaying() && window.AbhiAndroid) {
      try { window.AbhiAndroid.enterPip(); } catch (e) {}
    }
  });
  window.addEventListener('pagehide', function () {
    if (isYT() && window.AbhiAndroid) {
      try { window.AbhiAndroid.enterPip(); } catch (e) {}
    }
  });

  var pipBtn = $q('#pipBtn');
  if (pipBtn) {
    pipBtn.onclick = function () {
      if (window.AbhiAndroid) {
        try {
          window.AbhiAndroid.setVideoActive(true);
          window.AbhiAndroid.enterPip();
        } catch (e) {}
      }
    };
  }

  window.__ABHI_V191 = true;
  try { console.info('Abhi Music v1.9.1 mini-player + background fix loaded'); } catch (e) {}
})();

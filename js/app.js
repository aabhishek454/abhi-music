/* ABHI MUSIC — App Shell, Router, UI wiring */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- ROUTER ---------- */
const Router = {
  routes: { '':'home', '#/':'home' },
  current: 'home',
  init() {
    window.addEventListener('hashchange', () => this.handle());
    this.handle(true);
  },
  go(path) { location.hash = '#/' + path; },
  handle(first=false) {
    const raw = location.hash.replace(/^#\/?/, '');
    const [page, param] = raw.split('/');
    this.current = page || 'home';
    this.render();
    if (!first) $('.main').scrollTop = 0;
  },
  render() {
    const main = $('.main');
    let html;
    switch (Router.current) {
      case 'search':   html = viewSearch(); break;
      case 'discover': html = viewDiscover(); break;
      case 'library':  html = viewLibrary(); break;
      case 'settings': html = viewSettings(); break;
      case 'album':
      case 'playlist':
      case 'mood':     html = viewCollection(Router.rawParam()); break;
      case 'artist':   html = viewArtist(Router.rawParam()); break;
      default:         html = viewHome();
    }
    main.innerHTML = `<div class="view">${html}</div>`;
    UI.syncNav();
    if (Router.current === 'search') {
      const inp = $('#searchInput');
      if (inp) {
        inp.addEventListener('input', e => renderSearchResults(e.target.value));
        inp.focus();
      }
    }
    UI.syncPlayingRows();
  },
  rawParam() { return location.hash.replace(/^#\/[^/]+\//, ''); },
};

function navTo(path) {
  if (path.startsWith('artist/') || path.startsWith('album/') || path.startsWith('playlist/') || path.startsWith('mood/')) Router.go(path);
}

/* ---------- UI CONTROLLER ---------- */
const UI = {
  toastTimer: null,
  toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className='toast glass-elevated'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(()=>t.classList.add('show'));
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
  },

  applyAmbient(t) {
    // Derive ambient tones deterministically from track id (artwork-driven feel)
    const hues = [215, 265, 320, 20, 160];
    let h = 0; for (const c of t.id) h = (h*31 + c.charCodeAt(0)) % 997;
    const hue = hues[h % hues.length] + (h % 24) - 12;
    const r = document.documentElement.style;
    r.setProperty('--ambient-1', `hsl(${hue} 42% 16%)`);
    r.setProperty('--ambient-2', `hsl(${(hue+50)%360} 38% 12%)`);
    r.setProperty('--ambient-3', `hsl(${hue} 30% 8%)`);
  },

  onTime(pos, dur) {
    const frac = dur ? (pos/dur)*100 : 0;
    $$('.progress-fill').forEach(el => el.style.width = frac+'%');
    $$('[data-time-cur]').forEach(el=>el.textContent = fmtTime(pos));
    $$('[data-time-dur]').forEach(el=>el.textContent = fmtTime(dur||0));
    const bar = $('.mp-bar div'); if (bar) bar.style.width = frac+'%';
    // lyrics sync
    const lines = $$('.lyric-line');
    if (lines.length && dur) {
      const idx = Math.min(lines.length-1, Math.floor((pos/dur) * lines.length));
      lines.forEach((l,i)=>l.classList.toggle('active', i===idx));
      if ($('.nowplaying.open') && lines[idx]) lines[idx].scrollIntoView({block:'center', behavior:'smooth'});
    }
  },

  onPlayState() {
    const cur = Player.current();
    $$('.pc-main').forEach(b => b.innerHTML = PlayerState.playing ? I.pause : I.play);
    $$('.np-art').forEach(a => a.classList.toggle('paused', !PlayerState.playing));
    $$('.visualizer').forEach(v => v.classList.toggle('paused', !PlayerState.playing));
    const mini = $('.miniplayer');
    if (mini) mini.classList.toggle('show', !!cur);
    this.syncPlayingRows();
  },

  syncPlayingRows() {
    const cur = Player.current();
    $$('.track-row').forEach(row => {
      const id = row.dataset.play;
      row.classList.toggle('playing', row.dataset.ctx ? false : id === cur);
      const tt = row.querySelector('.t-title');
      if (tt) tt.classList.toggle('now', id === cur);
      const num = row.querySelector('.t-num');
      if (num) {
        if (id === cur) { num.innerHTML = PlayerState.playing
          ? '<span class="visualizer"><span></span><span></span><span></span><span></span></span>'
          : I.play; num.classList.add('eq'); }
        else { num.textContent = num.dataset.orig ?? num.textContent.match(/^\d+$/)?.[0] ?? ''; }
        if (!num.dataset.orig) num.dataset.orig = num.getAttribute('data-num') || '';
      }
    });
    // wide cards play icon state
    $$('[data-playonly]').forEach(()=>{}); // no-op placeholder
  },

  renderPlayer() {
    const cur = MusicService.getTrack(Player.current());
    const p = $('#player');
    if (!cur) { return; }
    p.innerHTML = `
      <div class="p-left">
        <img class="p-art" src="${cur.art}" alt="" data-np-open>
        <div class="p-meta">
          <div class="p-title" data-np-open title="${esc(cur.title)}">${esc(cur.title)}</div>
          <div class="p-artist">${esc(cur.artist)}</div>
        </div>
        <button class="icon-btn p-like ${PlayerState.liked.has(cur.id)?'liked':''}" data-like="${cur.id}" aria-label="Like">${PlayerState.liked.has(cur.id)?I.heartF:I.heart}</button>
      </div>
      <div class="p-center">
        <div class="p-controls">
          <button class="pc-btn ${PlayerState.shuffle?'active':''}" data-ctrl="shuffle" aria-label="Shuffle">${I.shuffle}</button>
          <button class="pc-btn" data-ctrl="prev" aria-label="Previous">${I.prev}</button>
          <button class="pc-main" data-ctrl="toggle" aria-label="Play/Pause">${PlayerState.playing?I.pause:I.play}</button>
          <button class="pc-btn" data-ctrl="next" aria-label="Next">${I.next}</button>
          <button class="pc-btn ${PlayerState.repeat!=='off'?'active':''}" data-ctrl="repeat" aria-label="Repeat">${PlayerState.repeat==='one'?I.repeat1:I.repeat}</button>
        </div>
        <div class="progress-wrap">
          <span class="time" data-time-cur>0:00</span>
          <div class="progress" id="seekbar"><div class="progress-track"><div class="progress-fill"></div></div></div>
          <span class="time" data-time-dur>${fmtTime(cur.dur)}</span>
        </div>
      </div>
      <div class="p-right">
        <button class="pc-btn" data-ctrl="lyrics" aria-label="Lyrics">${I.lyrics}</button>
        <button class="pc-btn" data-ctrl="queue" aria-label="Queue">${I.queue}</button>
        <div class="vol-wrap">
          <button class="pc-btn" data-ctrl="mute" aria-label="Mute">${PlayerState.muted?I.volX:I.vol}</button>
          <div class="vol"><div class="progress" id="volbar"><div class="progress-track"><div class="progress-fill" style="width:${PlayerState.muted?0:PlayerState.volume*100}%"></div></div></div></div>
        </div>
      </div>`;
    this.bindSeekbars();
    this.syncControls();
  },

  bindSeekbars() {
    const seek = $('#seekbar');
    if (seek) seek.onclick = e => {
      const r = seek.getBoundingClientRect();
      Player.seek((e.clientX - r.left)/r.width);
    };
    const vol = $('#volbar');
    if (vol) vol.onclick = e => {
      const r = vol.getBoundingClientRect();
      Player.setVolume((e.clientX - r.left)/r.width);
      const f = vol.querySelector('.progress-fill');
      if (f) f.style.width = PlayerState.volume*100+'%';
    };
  },

  syncControls() {
    $$('[data-ctrl]').forEach(btn => {
      const k = btn.dataset.ctrl;
      btn.classList.toggle('active',
        (k==='shuffle'&&PlayerState.shuffle) || (k==='repeat'&&PlayerState.repeat!=='off'));
      if (k==='repeat') btn.innerHTML = PlayerState.repeat==='one'?I.repeat1:I.repeat;
      if (k==='mute') btn.innerHTML = PlayerState.muted?I.volX:I.vol;
      if (k==='toggle') btn.innerHTML = PlayerState.playing?I.pause:I.play;
    });
    const vf = $('#volbar .progress-fill');
    if (vf) vf.style.width = (PlayerState.muted?0:PlayerState.volume*100)+'%';
  },

  renderMini() {
    const m = $('#miniplayer');
    const cur = MusicService.getTrack(Player.current());
    if (!m || !cur) return;
    m.innerHTML = `
      <img class="p-art" src="${cur.art}" alt="" data-np-open style="cursor:pointer">
      <div class="mp-meta" data-np-open><div class="mp-title">${esc(cur.title)}</div><div class="mp-artist">${esc(cur.artist)}</div></div>
      <button class="icon-btn" data-like="${cur.id}" aria-label="Like" style="${PlayerState.liked.has(cur.id)?'color:var(--accent)':''}">${PlayerState.liked.has(cur.id)?I.heartF:I.heart}</button>
      <button class="icon-btn" data-mtoggle aria-label="Play/Pause">${PlayerState.playing?I.pause:I.play}</button>
      <div class="mp-bar"><div></div></div>`;
    m.classList.toggle('show', true);
    this.onPlayState();
  },

  renderQueue() {
    const q = $('#queuePanel'); if (!q) return;
    const cur = Player.current();
    const upcoming = PlayerState.queue.slice(PlayerState.index+1);
    q.innerHTML = `
      <div class="q-head"><h3>Queue</h3><button class="icon-btn" data-qclose aria-label="Close">${I.chevD}</button></div>
      <div class="q-list">
        ${cur ? `<div class="nav-label">Now Playing</div>
        <div class="q-item"><img src="${MusicService.getTrack(cur).art}" alt="">
          <div><div class="t-title now">${esc(MusicService.getTrack(cur).title)}</div><div class="t-artist">${esc(MusicService.getTrack(cur).artist)}</div></div></div>`:''}
        ${upcoming.length ? `<div class="nav-label">Next Up</div>` + upcoming.map((id,i)=>{
          const t = MusicService.getTrack(id); const qi = PlayerState.index+1+i;
          return `<div class="q-item"><img src="${t.art}" alt="" loading="lazy">
            <div><div class="t-title">${esc(t.title)}</div><div class="t-artist">${esc(t.artist)}</div></div>
            <button class="q-remove icon-btn" data-qremove="${qi}" aria-label="Remove">${I.plus.replace('plus','')}</button>
            <button class="q-remove icon-btn" data-qplay="${qi}" aria-label="Play now">${I.play}</button></div>`;
        }).join('') : `<div class="q-empty">Queue is empty — play something!</div>`}
      </div>`;
    q.querySelectorAll('[data-qremove]').forEach(b=>b.onclick=()=>Player.removeFromQueue(+b.dataset.qremove));
    q.querySelectorAll('[data-qplay]').forEach(b=>b.onclick=()=>{PlayerState.index=+b.dataset.qplay; Player.load(PlayerState.queue[PlayerState.index]);});
    q.querySelector('[data-qclose]').onclick = ()=>q.classList.remove('open');
  },

  openNowPlaying(open=true) {
    const np = $('#nowplaying');
    const cur = MusicService.getTrack(Player.current());
    if (!np) return;
    if (open && !cur) return UI.toast('Play something first');
    if (open && cur) {
      np.innerHTML = `
        <div class="np-bg"><img src="${cur.art}" alt=""></div>
        <button class="icon-btn np-close" data-np-close aria-label="Close">${I.chevD}</button>
        <div class="np-body">
          <img class="np-art ${PlayerState.playing?'':'paused'}" src="${cur.art}" alt="${esc(cur.album)}">
          <div class="np-meta">
            <div><div class="t-title">${esc(cur.title)}</div><div class="t-artist">${esc(cur.artist)}</div></div>
            <button class="icon-btn ${PlayerState.liked.has(cur.id)?'':''}" data-like="${cur.id}" aria-label="Like" style="${PlayerState.liked.has(cur.id)?'color:var(--accent)':''}">${PlayerState.liked.has(cur.id)?I.heartF:I.heart}</button>
          </div>
          <div class="np-progress">
            <div class="progress" id="npSeek"><div class="progress-track"><div class="progress-fill"></div></div></div>
            <div class="np-times"><span data-time-cur>0:00</span><span data-time-dur>${fmtTime(cur.dur)}</span></div>
          </div>
          <div class="np-controls">
            <button class="pc-btn ${PlayerState.shuffle?'active':''}" data-ctrl="shuffle" aria-label="Shuffle">${I.shuffle}</button>
            <button class="pc-btn" data-ctrl="prev" aria-label="Previous">${I.prev}</button>
            <button class="pc-main" data-ctrl="toggle" aria-label="Play/Pause">${PlayerState.playing?I.pause:I.play}</button>
            <button class="pc-btn" data-ctrl="next" aria-label="Next">${I.next}</button>
            <button class="pc-btn ${PlayerState.repeat!=='off'?'active':''}" data-ctrl="repeat" aria-label="Repeat">${PlayerState.repeat==='one'?I.repeat1:I.repeat}</button>
          </div>
          <div class="np-extra">
            <button class="icon-btn" data-ctrl="queue" aria-label="Queue">${I.queue}</button>
            <button class="icon-btn" data-ctrl="lyrics" aria-label="Lyrics">${I.lyrics}</button>
            <button class="icon-btn" data-download="${cur.id}" aria-label="Download">${I.download}</button>
          </div>
        </div>
        <div class="lyrics-panel" id="lyricsPanel"></div>`;
      const lp = $('#lyricsPanel');
      const lyrics = MusicService.lyricsFor();
      lp.innerHTML = lyrics.map(l=>`<div class="lyric-line">${esc(l.replace(/^\[\d\d:\d\d\]\s*/,''))}</div>`).join('');
      const seek = $('#npSeek');
      seek.onclick = e => { const r=seek.getBoundingClientRect(); Player.seek((e.clientX-r.left)/r.width); };
    }
    np.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  },

  toggleLyricsInline() {
    if ($('#nowplaying.open')) { // scroll to lyrics in NP
      $('#lyricsPanel')?.scrollIntoView({behavior:'smooth'});
    } else {
      this.openNowPlaying(true);
      setTimeout(()=>$('#lyricsPanel')?.scrollIntoView({behavior:'smooth'}),350);
    }
  },

  syncLikes() {
    $$('[data-like]').forEach(b=>{
      const liked = PlayerState.liked.has(b.dataset.like);
      b.classList.toggle('liked', liked);
      b.innerHTML = liked?I.heartF:I.heart;
      b.style.color = liked ? 'var(--accent)' : '';
    });
    if (Router.current==='library') Router.render();
  },

  syncNav() {
    const map = { home:'home', discover:'discover', search:'search', library:'library', settings:'settings' };
    $$('.nav-item[data-navroot]').forEach(n=>n.classList.toggle('active', n.dataset.navroot===map[Router.current]));
    $$('.bn-item').forEach(n=>n.classList.toggle('active', n.dataset.navroot===map[Router.current]));
  },

  bindShell() {
    // global click delegation
    document.addEventListener('click', e => {
      const like = e.target.closest('[data-like]');
      if (like) { e.stopPropagation(); Player.toggleLike(like.dataset.like); return; }

      const mtog = e.target.closest('[data-mtoggle]');
      if (mtog) { this.renderMini(); Player.toggle(); mtog.innerHTML = PlayerState.playing?I.pause:I.play; return; }

      const npOpen = e.target.closest('[data-np-open]');
      if (npOpen) { this.openNowPlaying(true); return; }
      if (e.target.closest('[data-np-close]')) { this.openNowPlaying(false); return; }

      const ctrl = e.target.closest('[data-ctrl]');
      if (ctrl) {
        const k = ctrl.dataset.ctrl;
        ({toggle:()=>Player.toggle(), next:()=>Player.next(), prev:()=>Player.prev(),
          shuffle:()=>Player.setShuffle(), repeat:()=>Player.cycleRepeat(),
          mute:()=>{Player.toggleMute();}, queue:()=>this.toggleQueue(), lyrics:()=>this.toggleLyricsInline()})[k]?.();
        return;
      }

      const po = e.target.closest('[data-playonly]');
      if (po) { e.stopPropagation();
        const kind = po.dataset.kind;
        const col = MusicService.getCollection(po.dataset.playonly);
        Player.playContext(col.trackIds); return; }

      const ctx = e.target.closest('[data-play]');
      if (ctx && !e.target.closest('[data-like],[data-playonly]')) {
        const ids = JSON.parse(ctx.dataset.ctx || '[]');
        Player.playTrack(ctx.dataset.play, ids.length?ids:null);
        this.renderMini();
        return;
      }

      const pa = e.target.closest('[data-playall]');
      if (pa) { const col = MusicService.getCollection(pa.dataset.playall); Player.playContext(col.trackIds); this.renderMini(); this.toast('Playing '+col.name); return; }
      const sa = e.target.closest('[data-shuffleall]');
      if (sa) { const col = MusicService.getCollection(sa.dataset.shuffleall); Player.playContext(col.trackIds, true); this.renderMini(); this.toast('Shuffling '+col.name); return; }
      const par = e.target.closest('[data-playall-artist]');
      if (par) { const tr = MusicService.getArtistTracks(par.dataset.playallArtist); Player.playContext(tr.map(t=>t.id)); this.renderMini(); return; }
      const dl = e.target.closest('[data-download]');
      if (dl) { this.toast('Saved for offline playback ✓'); return; }
      const lc = e.target.closest('[data-likecoll]');
      if (lc) { const col = MusicService.getCollection(lc.dataset.likecoll); col.trackIds.forEach(id=>{ if(!PlayerState.liked.has(id)) Player.toggleLike(id); }); this.toast('Added to Liked Songs'); return; }
      const fl = e.target.closest('[data-follow]');
      if (fl) { fl.innerHTML = I.check+' Following'; this.toast('Following artist'); return; }

      const chipQ = e.target.closest('[data-q]');
      if (chipQ) { const inp=$('#searchInput'); inp.value=chipQ.dataset.q; renderSearchResults(chipQ.dataset.q); return; }
      const chipG = e.target.closest('[data-genre]');
      if (chipG) { const inp=$('#searchInput'); inp.value=chipG.dataset.genre; renderSearchResults(chipG.dataset.genre); return; }
      const libTabBtn = e.target.closest('[data-libtab]');
      if (libTabBtn) { libTab = libTabBtn.dataset.libtab; Router.render(); return; }

      const nav = e.target.closest('[data-nav]');
      if (nav) { Router.go(nav.dataset.nav); return; }
    });

    // keyboard: space toggles, arrows seek
    document.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code==='Space'){ e.preventDefault(); Player.toggle(); }
      if (e.key==='ArrowRight' && !$('#nowplaying.open')) {}
      if (e.key==='Escape') this.openNowPlaying(false);
    });

    // swipe down closes NP (mobile)
    let tsY=null;
    document.addEventListener('touchstart',e=>{tsY=e.touches[0].clientY;},{passive:true});
    document.addEventListener('touchend',e=>{
      if(tsY!==null && $('.nowplaying.open') && e.changedTouches[0].clientY-tsY>90){
        if(!e.target.closest('.lyrics-panel')) this.openNowPlaying(false);
      } tsY=null;
    },{passive:true});

    // settings bindings
    document.addEventListener('input', e => {
      if (e.target.matches('[data-volpref]')) { Player.setVolume(+e.target.value); }
      if (e.target.matches('[data-motionpref]')) {
        document.body.dataset.motion = e.target.checked ? '' : undefined;
        document.body.style.setProperty('--glass-blur', e.target.checked ? '6px' : '');
      }
    });
    document.addEventListener('click', e => {
      if (e.target.closest('#clearDataBtn')) {
        localStorage.clear(); PlayerState.liked.clear(); PlayerState.recent=[];
        this.toast('Local data cleared'); Router.render();
      }
    });
  },

  toggleQueue() {
    const q = $('#queuePanel');
    q.classList.toggle('open');
    if (q.classList.contains('open')) this.renderQueue();
  },
};

/* ---------- BOOT ---------- */
document.addEventListener('DOMContentLoaded', () => {
  AudioEngine.init();
  UI.bindShell();

  $('#player').innerHTML = `
    <div class="p-left"><div class="p-meta"><div class="p-title" style="color:var(--text-muted)">Nothing playing</div>
    <div class="p-artist">Press play to start your universe</div></div></div>
    <div class="p-center"><div class="p-controls">
      <button class="pc-btn" data-ctrl="shuffle">${I.shuffle}</button>
      <button class="pc-btn" data-ctrl="prev">${I.prev}</button>
      <button class="pc-main" data-ctrl="toggle" aria-label="Play">${I.play}</button>
      <button class="pc-btn" data-ctrl="next">${I.next}</button>
      <button class="pc-btn" data-ctrl="repeat">${I.repeat}</button>
    </div></div><div class="p-right"></div>`;

  // Build sidebar nav
  $('#sidebarNav').innerHTML = `
    <div class="nav-group">
      ${[['home','Home',I.home],['discover','Discover',I.compass],['search','Search',I.search]].map(([r,l,ic])=>
        `<button class="nav-item" data-navroot="${r}" data-nav="${r}">${ic} ${l}</button>`).join('')}
    </div>
    <div class="nav-group">
      <div class="nav-label">Library</div>
      <button class="nav-item" data-navroot="library" data-nav="library">${I.library} Library</button>
      <button class="nav-item" data-nav="library" data-libnav="liked">${I.heart} Liked Songs</button>
      <button class="nav-item" data-nav="discover">${I.clock} Recently Played</button>
    </div>
    <div class="nav-spacer"></div>
    <button class="profile-chip" data-nav="settings">
      <span class="avatar">A</span>
      <span><span style="display:block;font-weight:600;font-size:13.5px">Abhi</span>
      <span style="display:block;font-size:11px;color:var(--text-muted)">Free plan · Settings</span></span>
    </button>`;

  $('#bottomNav').innerHTML = [
    ['home','Home',I.home],['search','Search',I.search],['discover','Discover',I.compass],
    ['library','Library',I.library],['settings','Profile',I.user],
  ].map(([r,l,ic])=>`<button class="bn-item" data-navroot="${r}" data-nav="${r}">${ic}<span>${l}</span></button>`).join('');

  Router.init();
  UI.renderMini();

  // Load live catalog (iTunes-backed) then refresh home
  loadLive().then(ok => {
    if (ok && ['home',''].includes(Router.current)) Router.render();
  });

  if ('serviceWorker' in navigator && location.protocol==='https:') {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
});
/* ABHI MUSIC — Views (page renderers) */

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* LIVE — remote tracks fetched from /api (iTunes-backed) */
const LIVE = { trending:[], bollywood:[], punjabi:[], arijit:[], diljit:[], chill:[], youtube:[] };
function registerRemote(tracks) {
  tracks.forEach(t => window.REMOTE_INDEX.set(t.id, t));
}
async function loadLive() {
  const d = await MusicService.fetchDiscover();
  if (!d || !d.length) {
    UI.toast('Live catalog unavailable — showing demo tracks');
    return false;
  }
  // bucket by source term order returned from /api/discover
  const buckets = { hero:'bollywood', trending:'trending', punjabi:'punjabi', pop:'arijit', artist:'diljit', chill:'chill' };
  let idx = 0;
  // fetchDiscover flattens; re-request raw for buckets
  try {
    const r = await fetch('/api/discover');
    const raw = await r.json();
    for (const [k, name] of Object.entries(buckets)) {
      LIVE[name] = (raw[k]||[]).map(t => MusicService._norm(t));
    }
    Object.values(LIVE).forEach(registerRemote);
    return true;
  } catch { return false; }
}

/* ---------- shared fragments ---------- */
function cardHTML(item, kind = 'collection') {
  if (kind === 'artist') {
    return `<button class="card round" data-nav="artist/${item.id}" aria-label="${esc(item.name)}">
      <img class="card-art" src="${item.art}" alt="" loading="lazy">
      <span class="card-play">${I.play}</span>
      <div class="card-title">${esc(item.name)}</div>
      <div class="card-sub">Artist · ${esc(item.followers)} followers</div></button>`;
  }
  const isArtistCol = kind === 'album';
  return `<button class="card ${kind==='wide'?'wide':''}" data-nav="${isArtistCol?'album':'playlist'}/${item.id}" data-play="${item.id}" data-kind="${isArtistCol?'album':'playlist'}" aria-label="Play ${esc(item.name)}">
    <img class="card-art" src="${item.art}" alt="" loading="lazy">
    <span class="card-play" data-playonly="${item.id}" data-kind="${isArtistCol?'album':'playlist'}">${I.play}</span>
    <div class="card-body"><div class="card-title">${esc(item.name)}</div><div class="card-sub">${esc(kind==='wide'&&item.desc? item.desc : item.creator)}</div></div></button>`;
}

function trackRowHTML(t, i, ctxIds, showAlbum = true) {
  const liked = PlayerState.liked.has(t.id);
  return `<button class="track-row" data-play="${t.id}" data-ctx='${JSON.stringify(ctxIds)}'>
    <span class="t-num" data-num="${t.id}">${i+1}</span>
    <img class="t-art" src="${t.art}" alt="" loading="lazy">
    <span class="t-info"><span class="t-title" data-tt="${t.id}">${esc(t.title)}</span><span class="t-artist">${esc(t.artist)}</span></span>
    ${showAlbum ? `<span class="t-dur t-album-cell" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);font-size:12.5px">${esc(t.album)}</span>` : ''}
    <span class="t-like ${liked?'liked':''}" data-like="${t.id}" role="button" tabindex="0" aria-label="Like">${liked?I.heartF:I.heart}</span>
    <span class="t-dur">${fmtTime(t.dur)}</span>
  </button>`;
}

const sectionHead = (title, id='') => `<div class="section-head"><h2>${title}</h2>${id?`<button data-nav="${id}">Show all</button>`:''}</div>`;
const emptyState = (iconEmoji,title,text,cta='',nav='') => `
  <div class="empty-state"><div class="es-icon">${iconEmoji}</div><h3>${title}</h3><p>${text}</p>
  ${cta?`<br><button class="btn-primary" data-nav="${nav}">${cta}</button>`:''}</div>`;

/* ---------- HOME ---------- */
function viewHome() {
  const hour = new Date().getHours();
  const greet = hour<12 ? 'Good Morning' : hour<17 ? 'Good Afternoon' : 'Good Evening';
  const recent = MusicService.getTracks(PlayerState.recent).slice(0,6);
  const trending = LIVE.trending.length ? LIVE.trending : MusicService.trending();
  const featured = trending[0];
  const live = !!LIVE.trending.length;

  return `
  <div class="topbar mobile-only" style="position:static;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;">
    <div class="greeting" style="display:flex;align-items:center;gap:10px;"><span class="brand-mark" style="width:34px;height:34px;font-size:15px;border-radius:10px;">A</span><strong style="font-size:17px;">ABHI MUSIC</strong></div>
    <button class="icon-btn" data-nav="search" aria-label="Search">${I.search}</button>
  </div>
  <div class="content-pad">
    <section class="section" style="margin-top:var(--s-4)">
      <div style="padding:0 var(--s-2) var(--s-4)">
        <h1 style="font-size:clamp(26px,4vw,36px);font-weight:800;letter-spacing:-.02em">${greet}, Abhi.</h1>
        <p style="color:var(--text-secondary);margin-top:4px">Your personal music universe awaits.</p>
      </div>
      ${featured ? `
      <div class="hscroll">
        <article class="hero-card glass-elevated">
          <img class="hero-art" src="${featured.art}" alt="" onerror="this.remove()">
          <img class="hc-art" src="${featured.art}" alt="${esc(featured.album)}" onerror="this.style.visibility='hidden'">
          <div>
            <span class="badge">${live?'Live · Featured today':'Featured today'}</span>
            <h3>${esc(featured.title)}</h3>
            <p>${esc(featured.artist)} — ${esc(featured.album||'')} ${featured.genre?'· '+esc(featured.genre):''}</p>
            <button class="btn-primary" data-play="${featured.id}" data-ctx='${JSON.stringify(trending.map(t=>t.id))}'>${I.play} Play now</button>
          </div>
        </article>
      </div>` : `<div class="skeleton" style="height:240px;border-radius:var(--r-xl)"></div>`}
    </section>

    ${recent.length ? `<section class="section">${sectionHead('Continue Listening')}<div class="hscroll">${recent.map(t=>trackWideCard(t)).join('')}</div></section>`:''}

    <section class="section">${sectionHead('Trending Now')}
      <div class="tracklist">${trending.slice(0,8).map((t,i)=>trackRowHTML(t,i,trending.map(x=>x.id))).join('')}</div>
    </section>

    ${LIVE.punjabi.length?`<section class="section">${sectionHead('Punjabi Hits')}
      <div class="tracklist">${LIVE.punjabi.slice(0,6).map((t,i)=>trackRowHTML(t,i,LIVE.punjabi.map(x=>x.id))).join('')}</div></section>`:''}

    ${LIVE.bollywood.length?`<section class="section">${sectionHead('Bollywood · Hero Picks')}
      <div class="tracklist">${LIVE.bollywood.slice(0,6).map((t,i)=>trackRowHTML(t,i,LIVE.bollywood.map(x=>x.id))).join('')}</div></section>`:''}

    ${LIVE.arijit.length?`<section class="section">${sectionHead('Arijit Singh')}
      <div class="tracklist">${LIVE.arijit.slice(0,6).map((t,i)=>trackRowHTML(t,i,LIVE.arijit.map(x=>x.id))).join('')}</div></section>`:''}

    ${LIVE.diljit.length?`<section class="section">${sectionHead('Diljit Dosanjh')}
      <div class="tracklist">${LIVE.diljit.slice(0,6).map((t,i)=>trackRowHTML(t,i,LIVE.diljit.map(x=>x.id))).join('')}</div></section>`:''}

    <section class="section">${sectionHead('Made For You','library')}
      <div class="grid-cards">${MusicService.madeForYou().map(p=>cardHTML(p,'playlist')).join('')}</div>
    </section>

    <section class="section">${sectionHead('Popular Artists')}
      <div class="hscroll">${MusicService.popularArtists().map(a=>cardHTML(a,'artist')).join('')}</div>
    </section>

    ${live?'':`<section class="section">${sectionHead('New Releases')}
      <div class="hscroll">${MusicService.newReleases().slice(0,8).map(c=>cardHTML(c)).join('')}</div>
    </section>`}

    <section class="section">${sectionHead('Full Songs — YouTube', '')}
      <div class="tracklist" id="ytSection">${LIVE.youtube.length
        ? LIVE.youtube.map((t,i)=>trackRowHTML(t,i,LIVE.youtube.map(x=>x.id))).join('')
        : '<div class="skeleton" style="height:200px;border-radius:var(--r-large)"></div>'}</div>
    </section>

    <section class="section">${sectionHead('Moods & Energy')}
      <div class="moods-grid">${MOODS.slice(0,8).map(moodTile).join('')}</div>
    </section>
  </div>`;
}
const trackWideCard = t => {
  const cur = Player.current() === t.id;
  return `<button class="card wide" data-play="${t.id}" data-ctx='["${PlayerState.queue.join('","')}"]' aria-label="Play ${esc(t.title)}">
    <img class="card-art" src="${t.art}" alt="" loading="lazy">
    <span class="card-body"><span class="card-title ${cur?'now':''}">${esc(t.title)}</span><span class="card-sub">${esc(t.artist)}</span></span>
    <span class="card-play">${cur && PlayerState.playing ? I.pause : I.play}</span></button>`;
};

function moodTile(m) {
  return `<button class="mood-tile" style="background:linear-gradient(135deg,${m.grad[0]},${m.grad[1]})" data-nav="mood/${m.id}">
    ${esc(m.name)}</button>`;
}

/* ---------- SEARCH ---------- */
let _searchQ = '';
function viewSearch() {
  return `
  <div class="search-hero">
    <div class="search-box">${I.search}<input id="searchInput" type="search" placeholder="Songs, artists, albums, moods…" value="${esc(_searchQ)}" autocomplete="off"></div>
    <div class="chips" id="genreChips">${GENRES.map(g=>`<button class="chip" data-genre="${g}">${g}</button>`).join('')}</div>
  </div>
  <div class="content-pad" id="searchResults">
    <section class="section">${sectionHead('Trending searches')}
      <div class="chips">${['Neon Horizon','Kira Lumen','Night Drive','Lo-Fi','Monsoon Diaries'].map(s=>`<button class="chip" data-q="${s}">${s}</button>`).join('')}</div>
    </section>
    <section class="section">${sectionHead('Browse moods')}
      <div class="moods-grid">${MOODS.map(moodTile).join('')}</div>
    </section>
  </div>`;
}

async function renderSearchResults(q) {
  _searchQ = q;
  const el = document.getElementById('searchResults');
  if (!el) return;
  const r = MusicService.search(q);
  let remote = null;
  if (q.trim().length >= 2) {
    el.innerHTML = `<div class="skeleton" style="height:120px;border-radius:var(--r-large);margin-top:var(--s-4)"></div>`;
    remote = await MusicService.searchRemote(q.trim());
    registerRemote(remote || []);
    // re-render local results too (input may have changed)
    if (_searchQ !== q) return;
  }
  const liveTracks = remote || [];
  const allTracks = [...liveTracks, ...(r?r.tracks:[])];
  const top = allTracks[0];
  el.innerHTML = (!allTracks.length && !(r&&r.artists.length) && !(r&&r.albums.length) && !(r&&r.playlists.length))
    ? emptyState('🔍',`No results for “${esc(q)}”`,'Try a different spelling or browse the moods below.')
    : `
    ${top ? `<section class="section"><div class="section-head"><h2>Top Result</h2></div>
      <article class="hero-card glass-elevated" style="min-width:100%">
        <img class="hero-art" src="${top.art}" alt="" onerror="this.remove()"><img class="hc-art" src="${top.art}" alt="" onerror="this.style.visibility='hidden'">
        <div><span class="badge">${liveTracks.includes(top)?'Song · Live':'Song'}</span><h3 style="font-size:24px">${esc(top.title)}</h3>
        <p>${esc(top.artist)}${top.album?' · '+esc(top.album):''}</p>
        <button class="btn-primary" data-play="${top.id}" data-ctx='${JSON.stringify(allTracks.map(t=>t.id))}'>${I.play} Play</button></div>
      </article></section>` : ''}
    ${allTracks.length ? `<section class="result-group"><div class="section-head"><h2>Songs</h2></div>
      <div class="tracklist">${allTracks.slice(0,20).map((t,i)=>trackRowHTML(t,i,allTracks.map(x=>x.id))).join('')}</div></section>` : ''}
    ${r&&r.artists.length ? `<section class="result-group"><div class="section-head"><h2>Artists</h2></div>
      <div class="hscroll">${r.artists.map(a=>cardHTML(a,'artist')).join('')}</div></section>` : ''}
    ${r&&(r.albums.length||r.playlists.length) ? `<section class="result-group"><div class="section-head"><h2>Albums & Playlists</h2></div>
      <div class="grid-cards">${[...r.albums,...r.playlists].map(c=>cardHTML(c, c.type)).join('')}</div></section>`:''}`;
}

/* ---------- DISCOVER ---------- */
function viewDiscover() {
  const charts = [...TRACKS].sort(()=>Math.random()-.5).slice(0,10);
  return `
  <div class="detail-hero" style="padding-bottom:0">
    <div class="detail-info">
      <span class="detail-kind">Discover</span>
      <h1>Find your next<br>favourite sound.</h1>
      <p class="detail-desc">Fresh drops, deep cuts and new worlds of music curated for you every day.</p>
    </div>
  </div>
  <div class="content-pad">
    <section class="section">${sectionHead('Charts — Top 10')}
      <div class="tracklist">${charts.map((t,i)=>trackRowHTML(t,i,charts.map(x=>x.id))).join('')}</div>
    </section>
    <section class="section">${sectionHead('Hidden Gems')}
      <div class="hscroll">${[...COLLECTIONS].sort(()=>Math.random()-.5).slice(0,6).map(c=>cardHTML(c)).join('')}</div>
    </section>
    <section class="section">${sectionHead('Moods & Worlds')}
      <div class="moods-grid">${MOODS.map(moodTile).join('')}</div>
    </section>
  </div>`;
}

/* ---------- LIBRARY ---------- */
let libTab = 'songs';
function viewLibrary() {
  const tabs = [['songs','Songs'],['albums','Albums'],['artists','Artists'],['playlists','Playlists'],['liked','Liked']];
  let body = '';
  if (libTab === 'songs') {
    body = TRACKS.length
      ? `<div class="tracklist">${TRACKS.map((t,i)=>trackRowHTML(t,i,TRACKS.map(x=>x.id))).join('')}</div>`
      : emptyState('🎵','No songs yet','Play something and it will show up here.','Discover music','discover');
  } else if (libTab === 'albums') {
    body = `<div class="grid-cards">${COLLECTIONS.map(c=>cardHTML(c,'album')).join('')}</div>`;
  } else if (libTab === 'artists') {
    body = `<div class="grid-cards">${ARTISTS.map(a=>cardHTML(a,'artist')).join('')}</div>`;
  } else if (libTab === 'playlists') {
    body = `<div class="grid-cards">${PLAYLISTS.map(p=>cardHTML(p,'playlist')).join('')}</div>`;
  } else if (libTab === 'liked') {
    const liked = MusicService.getTracks([...PlayerState.liked]);
    body = liked.length
      ? `<div class="tracklist">${liked.map((t,i)=>trackRowHTML(t,i,liked.map(x=>x.id))).join('')}</div>`
      : emptyState('💚','No liked songs yet','Tap the heart on any track to save it here.');
  }
  return `
  <div class="detail-hero" style="padding-bottom:var(--s-6)">
    <div class="detail-info"><span class="detail-kind">Your Library</span><h1 style="font-size:clamp(28px,4vw,44px)">Library</h1></div>
  </div>
  <div class="content-pad">
    <div class="chips">${tabs.map(([k,l])=>`<button class="chip ${libTab===k?'active':''}" data-libtab="${k}">${l}${k==='liked'?` (${PlayerState.liked.size})`:''}</button>`).join('')}</div>
    <section class="section" style="margin-top:var(--s-5)">${body}</section>
  </div>`;
}

/* ---------- COLLECTION DETAIL (album / playlist / mood) ---------- */
function viewCollection(id) {
  const col = MusicService.getCollection(id);
  if (!col || !col.trackIds) return emptyState('🎧','Not found','This collection does not exist.','Go home','');
  const tracks = MusicService.getTracks(col.trackIds);
  const ids = col.trackIds;
  const isArtistPage = false;
  return `
  <button class="back-btn" onclick="history.back()">${I.chevL} Back</button>
  <div class="detail-hero">
    <img class="detail-art" src="${col.art}" alt="${esc(col.name)}">
    <div class="detail-info">
      <span class="detail-kind">${col.type === 'album' ? 'Album' : col.type === 'playlist' ? 'Playlist' : 'Mood World'}</span>
      <h1>${esc(col.name)}</h1>
      ${col.desc?`<p class="detail-desc">${esc(col.desc)}</p>`:''}
      <p class="detail-meta">${esc(col.creator)} · ${tracks.length} songs · ${fmtTotal(tracks)}</p>
    </div>
  </div>
  <div class="detail-actions">
    <button class="btn-primary" data-playall="${col.id}">${I.play} Play</button>
    <button class="btn-ghost" data-shuffleall="${col.id}">${I.shuffle} Shuffle</button>
    <button class="btn-ghost" data-likecoll="${col.id}">${I.heart} Like</button>
    <button class="btn-ghost" data-download="${col.id}">${I.download} Download</button>
  </div>
  <div class="content-pad">
    <div class="tracklist">${tracks.map((t,i)=>trackRowHTML(t,i,ids)).join('')}</div>
    ${col.type!=='album' ? `<section class="section">${sectionHead('You might also like')}
      <div class="hscroll">${COLLECTIONS.filter(c=>c.id!==col.id).slice(0,6).map(c=>cardHTML(c)).join('')}</div></section>`:''}
  </div>`;
}

/* ---------- ARTIST ---------- */
function viewArtist(id) {
  const a = MusicService.getArtist(id);
  if (!a) return emptyState('🎤','Artist not found','','Go home','');
  const tracks = MusicService.getArtistTracks(id);
  const albums = MusicService.getArtistAlbums(id);
  const related = ARTISTS.filter(x=>x.id!==id).slice(0,6);
  return `
  <div class="artist-hero">
    <img src="${a.art}" alt="${esc(a.name)}" style="width:130px;height:130px;border-radius:50%;object-fit:cover;box-shadow:0 20px 50px rgba(0,0,0,.6);margin-bottom:var(--s-4)">
    <div class="artist-verified">${a.verified?I.verified+' Verified Artist':''}</div>
    <h1>${esc(a.name)}</h1>
    <p style="color:var(--text-secondary);margin-top:6px">${esc(a.followers)} followers · ${tracks.length} songs</p>
    <div style="display:flex;gap:var(--s-3);margin-top:var(--s-5)">
      <button class="btn-primary" data-playall-artist="${id}">${I.play} Play</button>
      <button class="btn-ghost" data-follow="${id}">${I.plus} Follow</button>
    </div>
  </div>
  <div class="content-pad">
    <section class="section">${sectionHead('Popular')}
      <div class="tracklist">${tracks.map((t,i)=>trackRowHTML(t,i,tracks.map(x=>x.id),false)).join('')}</div>
    </section>
    ${albums.length?`<section class="section">${sectionHead('Discography')}
      <div class="hscroll">${albums.map(c=>cardHTML(c,'album')).join('')}</div></section>`:''}
    <section class="section">${sectionHead('Fans also like')}
      <div class="hscroll">${related.map(x=>cardHTML(x,'artist')).join('')}</div>
    </section>
  </div>`;
}

/* ---------- SETTINGS ---------- */
function viewSettings() {
  return `
  <div class="detail-hero" style="padding-bottom:var(--s-6)">
    <div class="detail-info"><span class="detail-kind">Preferences</span><h1 style="font-size:clamp(28px,4vw,44px)">Settings</h1></div>
  </div>
  <div class="content-pad" style="max-width:640px">
    <div class="glass" style="border-radius:var(--r-large);padding:var(--s-6);margin-bottom:var(--s-4)">
      <h3 style="margin-bottom:var(--s-4)">Playback</h3>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
        <span>Default volume</span>
        <input type="range" min="0" max="1" step="0.05" value="${PlayerState.volume}" data-volpref style="accent-color:var(--accent);width:160px">
      </label>
      <label style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;cursor:pointer">
        <span>Reduce motion & effects</span>
        <input type="checkbox" data-motionpref ${document.body.dataset.motion?'checked':''} style="accent-color:var(--accent);width:18px;height:18px">
      </label>
    </div>
    <div class="glass" style="border-radius:var(--r-large);padding:var(--s-6);margin-bottom:var(--s-4)">
      <h3 style="margin-bottom:var(--s-4)">Data</h3>
      <p style="color:var(--text-secondary);font-size:13.5px;margin-bottom:var(--s-4)">${PlayerState.recent.length} recently played · ${PlayerState.liked.size} liked songs stored locally on this device.</p>
      <button class="btn-ghost" id="clearDataBtn">${I.check} Clear local data</button>
    </div>
    <p style="color:var(--text-muted);font-size:12.5px;text-align:center;padding:var(--s-6)">ABHI MUSIC v1.0 — Your Personal Music Universe</p>
  </div>`;
}

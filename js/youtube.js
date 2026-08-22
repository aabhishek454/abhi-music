/* ABHI MUSIC — YouTube catalog via /api/youtube (full-length playback) */

const YTLIVE = { items: [], loaded: false };

function ytNorm(v) {
  return {
    id: v.id,
    title: v.title,
    artist: v.artist,
    album: v.album || 'YouTube',
    art: v.artwork || `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
    dur: Math.round((v.duration || 0) / 1000),
    genre: v.genre || 'Music',
    youtubeId: v.youtubeId,
    source: 'youtube',
    preview: null, // no direct stream; plays via IFrame embed
    src: null,
  };
}

async function loadYouTube(section = 'trending') {
  try {
    const r = await fetch('/api/youtube?q=' + encodeURIComponent(
      section === 'punjabi' ? 'punjabi hits official audio' :
      section === 'bollywood' ? 'bollywood hits official audio' :
      'latest Indian music official audio'
    ));
    if (!r.ok) throw 0;
    const list = (await r.json()).map(ytNorm);
    registerRemote(list);
    return list;
  } catch { return []; }
}

/* Full-song playback via hidden YouTube IFrame */
let _ytReadyPromise = null;
function loadYTApi() {
  if (_ytReadyPromise) return _ytReadyPromise;
  _ytReadyPromise = new Promise(resolve => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
    setTimeout(resolve, 6000); // don't hang forever
  });
  return _ytReadyPromise;
}

let _ytPlayer = null;
async function playViaYouTube(videoId, onState) {
  if (!_ytPlayer) {
    await loadYTApi();
    if (!window.YT) return false;
    const holder = document.createElement('div');
    holder.id = 'yt-holder';
    holder.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:0;opacity:0;pointer-events:none;';
    document.body.appendChild(holder);
    _ytPlayer = new window.YT.Player('yt-holder', {
      height: '1', width: '1',
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1 },
      events: {
        onReady: e => e.target.playVideo(),
        onStateChange: e => {
          // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
          onState(e.data);
        },
        onError: () => UI.toast('This track can\'t be played — skipping…'),
      }
    });
  } else {
    _ytPlayer.loadVideoById(videoId);
  }
  return true;
}

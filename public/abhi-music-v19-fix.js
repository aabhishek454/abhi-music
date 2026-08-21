/* v1.9 mini-player + background play fix */
(function(){
  'use strict';
  function absUrl(u){try{if(!u||u==='#'||String(u).startsWith('blob:'))return null;return new URL(u,location.origin).href}catch(e){return null}}
  function canNative(t){return !!(window.AbhiAndroid&&t&&t.source!=='youtube'&&absUrl(t.preview))}
  function isYT(){return state&&state.current&&state.current.source==='youtube'}
  function $q(s){return document.querySelector(s)}

  // 1) Closing full player must NOT stop music
  window.closeFullPlayer=function(){
    var fp=$q('#fullPlayer');
    if(fp){fp.classList.remove('open');fp.setAttribute('aria-hidden','true')}
  };

  // 2) Play without forcing full-screen window
  window.playTrack=function(t,source){
    if(!t)return;
    if(source){
      var idx=source.findIndex(function(x){return x.id===t.id});
      state.queue=source.slice(idx+1).concat(source.slice(0,idx));
    }
    state.current=t;
    try{recordPlay(t)}catch(e){}
    activeLyrics=[];
    try{maybePreviewTip(t)}catch(e){}

    if(t.source==='youtube'){
      try{audio.pause();audio.removeAttribute('src')}catch(e){}
      if(window.AbhiAndroid){try{window.AbhiAndroid.setVideoActive(true)}catch(e){}}
      var dock=$q('#videoDock'); if(dock) dock.classList.add('visible');
      var fp=$q('#fullPlayer'); if(fp) fp.classList.remove('open');
      (function start(){
        if(typeof ytReady!=='undefined'&&ytReady&&ytPlayer){
          try{ytPlayer.loadVideoById(t.youtubeId);ytPlayer.playVideo()}catch(e){try{ytPlayer.loadVideoById(t.youtubeId)}catch(e2){}}
        } else setTimeout(start,200);
      })();
    } else {
      try{if(ytReady&&ytPlayer)ytPlayer.stopVideo()}catch(e){}
      var dock=$q('#videoDock'); if(dock) dock.classList.remove('visible');
      if(canNative(t)){
        try{audio.pause();audio.removeAttribute('src')}catch(e){}
        window.AbhiAndroid.play(absUrl(t.preview),t.title,t.artist,t.artwork||'');
        try{toast('Background play on')}catch(e){}
      } else {
        audio.src=t.preview;
        audio.play().catch(function(){try{toast('Tap \u25b6 on the mini player')}catch(e){}});
      }
    }
    state.recent=[t].concat(state.recent.filter(function(x){return x.id!==t.id})).slice(0,30);
    try{persist();updatePlayer();renderQueue();renderCurrentRows()}catch(e){}
  };

  // 3) Mini play button: play/pause only — never open full window first
  window.togglePlayback=function(){
    if(!state.current){if(state.hero)return playTrack(state.hero,state.tracks);return}
    if(isYT()){
      if(typeof ytReady==='undefined'||!ytReady||!ytPlayer){try{toast('Loading player\u2026')}catch(e){}return}
      var dock=$q('#videoDock'); if(dock) dock.classList.add('visible');
      try{
        var st=ytPlayer.getPlayerState();
        if(st===YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
      }catch(e){try{ytPlayer.playVideo()}catch(e2){}}
    } else if(canNative(state.current)){
      if(nativePlaying) window.AbhiAndroid.pause(); else window.AbhiAndroid.resume();
    } else {
      if(audio.paused) audio.play().catch(function(){}); else audio.pause();
    }
  };

  // 4) Rebind mini player: first tap plays, when playing tap opens full
  function bindMini(){
    var cover=$q('#playerImg')&&$q('#playerImg').parentElement;
    var meta=$q('#playerTitle')&&$q('#playerTitle').parentElement;
    var artist=$q('#playerArtist');
    function onMini(){
      if(!state.current)return;
      if(!playbackActive) togglePlayback(); else openFullPlayer();
    }
    if(cover) cover.onclick=onMini;
    if(meta) meta.onclick=onMini;
    if(artist) artist.onclick=onMini;
    var play=$q('#playBtn'); if(play) play.onclick=togglePlayback;
    var fullPlay=$q('#fullPlay'); if(fullPlay) fullPlay.onclick=togglePlayback;
    var close=$q('#closeFullPlayer'); if(close) close.onclick=closeFullPlayer;
  }
  bindMini();
  setTimeout(bindMini,800);
  setTimeout(bindMini,2000);

  // 5) Background: auto PiP for YouTube when app hides
  document.addEventListener('visibilitychange',function(){
    if(document.hidden&&isYT()&&playbackActive&&window.AbhiAndroid){
      try{window.AbhiAndroid.enterPip()}catch(e){}
    }
  });

  try{console.info('Abhi Music v1.9 playback fix loaded')}catch(e){}
})();

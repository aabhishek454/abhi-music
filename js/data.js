/* ABHI MUSIC — Types & Mock Data (service-layer ready) */

/** @typedef {{id:string,title:string,artist:string,artistId:string,album:string,albumId:string,dur:number,art:string,src?:string,genre?:string}} Track */
/** @typedef {{id:string,name:string,type:'album'|'playlist'|'mood',desc:string,creator:string,trackIds:string[],art:string}} Collection */

const Art = (seed, size = 400) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;

/* --- Artists --- */
const ARTISTS = [
  { id:'ar1', name:'Nova Waves', followers:'2.4M', verified:true },
  { id:'ar2', name:'Kira Lumen', followers:'1.8M', verified:true },
  { id:'ar3', name:'Echo District', followers:'956K', verified:false },
  { id:'ar4', name:'Midnight Pulse', followers:'3.1M', verified:true },
  { id:'ar5', name:'Sanya Rao', followers:'1.2M', verified:true },
  { id:'ar6', name:'Velvet Static', followers:'742K', verified:false },
  { id:'ar7', name:'Orbit Theory', followers:'588K', verified:false },
  { id:'ar8', name:'Aria Skyline', followers:'4.2M', verified:true },
];

const A = i => ARTISTS[i].name;
const AID = i => ARTISTS[i].id;

/* --- Tracks --- */
const TRACKS = [
  { id:'t1', title:'Neon Horizon',      artist:A(0), artistId:AID(0), album:'Afterglow City',    albumId:'al1', dur:214, genre:'Electronic' },
  { id:'t2', title:'Gravity Well',      artist:A(0), artistId:AID(0), album:'Afterglow City',    albumId:'al1', dur:187, genre:'Electronic' },
  { id:'t3', title:'Paper Lanterns',    artist:A(1), artistId:AID(1), album:'Lumen',             albumId:'al2', dur:243, genre:'Indie Pop' },
  { id:'t4', title:'Slow Motion Rain',  artist:A(1), artistId:AID(1), album:'Lumen',             albumId:'al2', dur:201, genre:'Indie Pop' },
  { id:'t5', title:'Concrete Bloom',    artist:A(2), artistId:AID(2), album:'Static Gardens',    albumId:'al3', dur:196, genre:'Alternative' },
  { id:'t6', title:'Run The Lights',    artist:A(3), artistId:AID(3), album:'Pulse Protocol',    albumId:'al4', dur:178, genre:'Synthwave' },
  { id:'t7', title:'Chrome Sunset',     artist:A(3), artistId:AID(3), album:'Pulse Protocol',    albumId:'al4', dur:226, genre:'Synthwave' },
  { id:'t8', title:'Monsoon Letters',   artist:A(4), artistId:AID(4), album:'Monsoon Diaries',   albumId:'al5', dur:268, genre:'Indie' },
  { id:'t9', title:'Rooftop Monsoon',   artist:A(4), artistId:AID(4), album:'Monsoon Diaries',   albumId:'al5', dur:234, genre:'Indie' },
  { id:'t10',title:'Velvet Hours',      artist:A(5), artistId:AID(5), album:'Analog Heart',      albumId:'al6', dur:259, genre:'Lo-Fi' },
  { id:'t11',title:'Cassette Dreams',   artist:A(5), artistId:AID(5), album:'Analog Heart',      albumId:'al6', dur:192, genre:'Lo-Fi' },
  { id:'t12',title:'Zero Gravity',      artist:A(6), artistId:AID(6), album:'Escape Velocity',   albumId:'al7', dur:205, genre:'Ambient' },
  { id:'t13',title:'Skyline Frequency', artist:A(7), artistId:AID(7), album:'Skyline',           albumId:'al8', dur:221, genre:'Pop' },
  { id:'t14',title:'Golden Hour Drive', artist:A(7), artistId:AID(7), album:'Skyline',           albumId:'al8', dur:198, genre:'Pop' },
  { id:'t15',title:'Deep Focus Loop',   artist:A(6), artistId:AID(6), album:'Signal & Noise',    albumId:'al9', dur:312, genre:'Focus' },
  { id:'t16',title:'Night Circuit',     artist:A(3), artistId:AID(3), album:'Pulse Protocol',    albumId:'al4', dur:189, genre:'Synthwave' },
  { id:'t17',title:'Soft Reset',        artist:A(5), artistId:AID(5), album:'Analog Heart',      albumId:'al6', dur:227, genre:'Lo-Fi' },
  { id:'t18',title:'Parallel Hearts',   artist:A(1), artistId:AID(1), album:'Lumen',             albumId:'al2', dur:215, genre:'Indie Pop' },
];

TRACKS.forEach(t => t.art = Art('abhi-'+t.id));
ARTISTS.forEach(a => a.art = Art('abhi-'+a.id, 500));

/* --- Albums / Playlists / Moods --- */
const COLLECTIONS = [
  { id:'al1', name:'Afterglow City',   type:'album', desc:'A neon-soaked journey through electronic soundscapes.', creator:A(0), trackIds:['t1','t2'] },
  { id:'al2', name:'Lumen',            type:'album', desc:'Intimate indie pop about light, distance and longing.', creator:A(1), trackIds:['t3','t4','t18'] },
  { id:'al3', name:'Static Gardens',   type:'album', desc:'Alternative textures grown from city noise.', creator:A(2), trackIds:['t5'] },
  { id:'al4', name:'Pulse Protocol',   type:'album', desc:'Synthwave built for midnight highways.', creator:A(3), trackIds:['t6','t7','t16'] },
  { id:'al5', name:'Monsoon Diaries',  type:'album', desc:'Rain-soaked indie from the rooftops of Mumbai.', creator:A(4), trackIds:['t8','t9'] },
  { id:'al6', name:'Analog Heart',     type:'album', desc:'Warm lo-fi recorded on tape machines.', creator:A(5), trackIds:['t10','t11','t17'] },
  { id:'al7', name:'Escape Velocity',  type:'album', desc:'Weightless ambient for deep thought.', creator:A(6), trackIds:['t12'] },
  { id:'al8', name:'Skyline',          type:'album', desc:'Stadium-sized pop with a golden-hour heart.', creator:A(7), trackIds:['t13','t14'] },
  { id:'al9', name:'Signal & Noise',   type:'album', desc:'Long-form focus loops for work and study.', creator:A(6), trackIds:['t15'] },
];

COLLECTIONS.forEach(c => c.art = Art('abhi-'+c.id, 500));

const PLAYLISTS = [
  { id:'pl1', name:'Daily Mix 01',     type:'playlist', desc:'Made for you — your favourite sounds, refreshed daily.', creator:'ABHI MUSIC', trackIds:['t1','t6','t13','t10'] },
  { id:'pl2', name:'Late Night Code',  type:'playlist', desc:'Beats to build the future by.', creator:'ABHI MUSIC', trackIds:['t12','t15','t11'] },
  { id:'pl3', name:'Monsoon Mood',     type:'playlist', desc:'Rainy-day indie and warm acoustics.', creator:'ABHI MUSIC', trackIds:['t8','t9','t4','t3'] },
  { id:'pl4', name:'Neon Nights',      type:'playlist', desc:'Synthwave after dark.', creator:'ABHI MUSIC', trackIds:['t6','t7','t16','t1'] },
  { id:'pl5', name:'Sunset Chill',     type:'playlist', desc:'Easy listening for golden hour.', creator:'ABHI MUSIC', trackIds:['t14','t3','t17','t10'] },
  { id:'pl6', name:'Workout Engine',   type:'playlist', desc:'High-energy fuel for every rep.', creator:'ABHI MUSIC', trackIds:['t6','t13','t14','t2'] },
];
PLAYLISTS.forEach(p => p.art = Art('abhi-'+p.id));

const MOODS = [
  { id:'m-chill',    name:'Chill',       grad:['#1e3a5f','#0e7490'], trackIds:['t17','t10','t12','t4'] },
  { id:'m-focus',    name:'Focus',       grad:['#312e81','#0f172a'], trackIds:['t15','t12','t11'] },
  { id:'m-workout',  name:'Workout',     grad:['#7f1d1d','#f97316'], trackIds:['t6','t13','t2'] },
  { id:'m-nightdrive',name:'Night Drive',grad:['#111827','#6d28d9'], trackIds:['t7','t16','t6'] },
  { id:'m-romantic', name:'Romantic',    grad:['#831843','#be185d'], trackIds:['t18','t3','t9'] },
  { id:'m-sad',      name:'Sad',         grad:['#1f2937','#334155'], trackIds:['t4','t8','t5'] },
  { id:'m-party',    name:'Party',       grad:['#a21caf','#ec4899'], trackIds:['t13','t14','t1'] },
  { id:'m-sleep',    name:'Sleep',       grad:['#0c4a6e','#164e63'], trackIds:['t12','t15','t17'] },
  { id:'m-lofi',     name:'Lo-Fi',       grad:['#292524','#78716c'], trackIds:['t10','t11','t17'] },
  { id:'m-bollywood',name:'Bollywood',   grad:['#b45309','#dc2626'], trackIds:['t8','t9','t13'] },
  { id:'m-indie',    name:'Indie',       grad:['#14532d','#65a30d'], trackIds:['t3','t8','t18'] },
  { id:'m-energy',   name:'Energy',      grad:['#ca8a04','#84cc16'], trackIds:['t2','t6','t14'] },
];

const LYRICS = {
  default: [
    '[00:00] (Instrumental intro)',
    '[00:08] Lights are low but the city hums',
    '[00:16] Every heartbeat is a drum',
    '[00:24] We were born inside the sound',
    '[00:32] Floating never touching ground',
    '[00:40] Turn it up until we disappear',
    '[00:48] There is nothing else but here',
    '[00:56] Neon horizon in my eyes',
    '[01:04] We are electric tonight',
  ],
};

const GENRES = ['Electronic','Indie Pop','Alternative','Synthwave','Indie','Lo-Fi','Ambient','Pop'];

/* --- Service layer (swap with real API later) --- */
const MusicService = {
  getTrack: id => TRACKS.find(t => t.id === id),
  getTracks: ids => ids.map(id => MusicService.getTrack(id)).filter(Boolean),
  getCollection: id => COLLECTIONS.find(c => c.id === id) || PLAYLISTS.find(p => p.id === id) || MOODS.find(m => m.id === id),
  getArtist: id => ARTISTS.find(a => a.id === id),
  getArtistTracks: id => TRACKS.filter(t => t.artistId === id),
  getArtistAlbums: id => COLLECTIONS.filter(c => c.creator === MusicService.getArtist(id)?.name),
  search(q) {
    q = q.trim().toLowerCase();
    if (!q) return null;
    return {
      tracks:  TRACKS.filter(t => (t.title+' '+t.artist+' '+t.album).toLowerCase().includes(q)),
      albums:  COLLECTIONS.filter(c => (c.name+' '+c.creator).toLowerCase().includes(q)),
      playlists: PLAYLISTS.filter(p => p.name.toLowerCase().includes(q)),
      artists: ARTISTS.filter(a => a.name.toLowerCase().includes(q)),
      moods: MOODS.filter(m => m.name.toLowerCase().includes(q)),
    };
  },
  trending: () => [...TRACKS].slice(0, 8),
  newReleases: () => [...COLLECTIONS].reverse(),
  madeForYou: () => PLAYLISTS.slice(0, 6),
  popularArtists: () => [...ARTISTS],
  lyricsFor: () => LYRICS.default,
};

const fmtTime = s => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s/60);
  return `${m}:${String(Math.floor(s%60)).padStart(2,'0')}`;
};
const fmtTotal = tracks => {
  const total = tracks.reduce((a,t)=>a+t.dur,0);
  const h = Math.floor(total/3600), m = Math.round((total%3600)/60);
  return h ? `${h} hr ${m} min` : `${m} min`;
};
package com.abhishek.abhimusic;

import android.app.*;
import android.content.*;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.*;
import android.media.audiofx.BassBoost;
import android.media.audiofx.Equalizer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.media.browse.MediaBrowser;
import android.media.MediaDescription;
import android.service.media.MediaBrowserService;
import android.net.Uri;
import android.os.*;
import java.util.*;
import java.net.URL;
import java.io.*;
import java.security.MessageDigest;
import org.json.JSONObject;

public class PlaybackService extends MediaBrowserService {
    public static final String BROADCAST_STATE="com.abhishek.abhimusic.PLAYBACK_STATE";
    public static final String ACTION_PLAY="play", ACTION_PAUSE="pause", ACTION_RESUME="resume", ACTION_SEEK="seek", ACTION_VOLUME="volume", ACTION_NEXT="next", ACTION_PREVIOUS="previous", ACTION_STOP="stop", ACTION_PRESET="preset", ACTION_SPEED="speed", ACTION_DOWNLOAD_MIX="download_mix";
    private static final String CHANNEL="abhi_music_playback";
    private static final int NOTIFICATION_ID=8219;
    private MediaPlayer player;
    private MediaSession session;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private String title="Abhi Music",artist="Made by Abhishek",artwork="";
    private Bitmap albumArt;
    private AudioManager audioManager;
    private boolean prepared=false;
    private BassBoost bassBoost;
    private Equalizer equalizer;
    private int currentPreset=0;
    private float playbackSpeed=1f;
    private int pendingSeek=0;
    private static final String[] MIX_URLS={"https://abhi-music-amber.vercel.app/music/lighthouse.mp3","https://abhi-music-amber.vercel.app/music/satellite.mp3","https://abhi-music-amber.vercel.app/music/final-notice.mp3"};
    private static final String[] MIX_IDS={"lighthouse","satellite","final-notice"};
    private static final String[] MIX_TITLES={"She Was My Lighthouse","Satellite","Final Notice"};
    private static final String MIX_ARTIST="Riding Alone For Thousands Of Miles";
    private static final String MIX_ARTWORK="https://archive.org/services/img/badpanda018";
    private String currentUrl="";
    private int currentMixIndex=-1;
    private boolean isPlayingSafe(){try{return prepared&&player!=null&&player.isPlaying();}catch(Exception e){return false;}}

    public static Intent intent(Context c,String action){return new Intent(c,PlaybackService.class).setAction(action);}

    @Override public BrowserRoot onGetRoot(String clientPackageName,int clientUid,Bundle rootHints){return new BrowserRoot("abhi_root",null);}
    @Override public void onLoadChildren(String parentId,Result<List<MediaBrowser.MediaItem>> result){List<MediaBrowser.MediaItem> items=new ArrayList<>();if("abhi_root".equals(parentId)){MediaDescription mix=new MediaDescription.Builder().setMediaId("background_mix").setTitle("Abhi's Background Mix").setSubtitle("Full tracks · Background ready").build();items.add(new MediaBrowser.MediaItem(mix,MediaBrowser.MediaItem.FLAG_BROWSABLE));}else if("background_mix".equals(parentId)){for(int i=0;i<MIX_IDS.length;i++){MediaDescription d=new MediaDescription.Builder().setMediaId(MIX_IDS[i]).setTitle(MIX_TITLES[i]).setSubtitle(MIX_ARTIST).setIconUri(Uri.parse(MIX_ARTWORK)).build();items.add(new MediaBrowser.MediaItem(d,MediaBrowser.MediaItem.FLAG_PLAYABLE));}}result.sendResult(items);}

    @Override public void onCreate(){
        super.onCreate(); createChannel(); audioManager=(AudioManager)getSystemService(AUDIO_SERVICE);
        session=new MediaSession(this,"AbhiMusicSession");
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){resumePlayback();}
            @Override public void onPause(){pausePlayback();}
            @Override public void onSeekTo(long pos){if(player!=null&&prepared)player.seekTo((int)pos);}
            @Override public void onSkipToNext(){playNext();}
            @Override public void onSkipToPrevious(){playPrevious();}
            @Override public void onPlayFromMediaId(String mediaId,Bundle extras){playMixById(mediaId);}
            @Override public void onStop(){stopPlayback();}
        });
        setSessionToken(session.getSessionToken());
        List<MediaSession.QueueItem> queue=new ArrayList<>();for(int i=0;i<MIX_IDS.length;i++){MediaDescription d=new MediaDescription.Builder().setMediaId(MIX_IDS[i]).setTitle(MIX_TITLES[i]).setSubtitle(MIX_ARTIST).setIconUri(Uri.parse(MIX_ARTWORK)).build();queue.add(new MediaSession.QueueItem(d,i));}session.setQueue(queue);session.setQueueTitle("Abhi's Background Mix");
        session.setActive(true); handler.post(progressTask);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null)return START_STICKY;String action=intent.getAction();
        if(ACTION_PLAY.equals(action)){playUrl(intent.getStringExtra("url"),intent.getStringExtra("title"),intent.getStringExtra("artist"),intent.getStringExtra("artwork"));}
        else if(ACTION_PAUSE.equals(action))pausePlayback();
        else if(ACTION_RESUME.equals(action))resumePlayback();
        else if(ACTION_SEEK.equals(action)){if(player!=null&&prepared)player.seekTo(intent.getIntExtra("position",0));}
        else if(ACTION_VOLUME.equals(action)){if(player!=null&&prepared){float v=intent.getFloatExtra("volume",1f);player.setVolume(v,v);}}
        else if(ACTION_PRESET.equals(action)){currentPreset=intent.getIntExtra("preset",0);applyPreset();}
        else if(ACTION_SPEED.equals(action)){playbackSpeed=intent.getFloatExtra("speed",1f);applySpeed();}
        else if(ACTION_DOWNLOAD_MIX.equals(action)){startForeground(NOTIFICATION_ID,buildNotification("Downloading offline mix…"));new Thread(this::downloadMix).start();}
        else if(ACTION_NEXT.equals(action))playNext();
        else if(ACTION_PREVIOUS.equals(action))playPrevious();
        else if(ACTION_STOP.equals(action))stopPlayback();
        return START_STICKY;
    }

    private void playUrl(String url,String t,String a,String art){
        if(url==null)return;currentUrl=url;currentMixIndex=-1;for(int i=0;i<MIX_URLS.length;i++)if(url.endsWith(MIX_URLS[i].substring(MIX_URLS[i].lastIndexOf('/')+1)))currentMixIndex=i;title=t==null?"Abhi Music":t;artist=a==null?"Abhishek":a;artwork=art==null?"":art;albumArt=null;getSharedPreferences("playback",MODE_PRIVATE).edit().putString("url",url).putString("title",title).putString("artist",artist).putString("artwork",artwork).apply();
        releasePlayer(); requestAudioFocus();
        prepared=false;player=new MediaPlayer();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
        player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
        player.setOnPreparedListener(mp->{prepared=true;setupEffects();applyPreset();applySpeed();if(pendingSeek>0){mp.seekTo(pendingSeek);pendingSeek=0;}mp.start();session.setMetadata(new android.media.MediaMetadata.Builder().putString(android.media.MediaMetadata.METADATA_KEY_TITLE,title).putString(android.media.MediaMetadata.METADATA_KEY_ARTIST,artist).putLong(android.media.MediaMetadata.METADATA_KEY_DURATION,mp.getDuration()).build());updateState();notifyPlayer();sendState(null);});
        player.setOnCompletionListener(mp->{if(currentMixIndex>=0)playNext();else sendState("next");});
        player.setOnErrorListener((mp,what,extra)->{sendState("error");return false;});
        try{File cached=cachedFile(url);player.setDataSource(cached.exists()?cached.getAbsolutePath():url);if(!cached.exists()&&url.contains("/music/"))new Thread(()->downloadFile(url,cached)).start();startForeground(NOTIFICATION_ID,buildNotification("Loading…"));player.prepareAsync();loadArtwork();}catch(Exception e){sendState("error");stopSelf();}
    }

    private void playMixById(String id){for(int i=0;i<MIX_IDS.length;i++)if(MIX_IDS[i].equals(id)){playMixIndex(i);return;}}
    private void playMixIndex(int index){index=(index+MIX_URLS.length)%MIX_URLS.length;playUrl(MIX_URLS[index],MIX_TITLES[index],MIX_ARTIST,MIX_ARTWORK);}
    private void playNext(){if(currentMixIndex>=0)playMixIndex(currentMixIndex+1);else sendCommand("next");}
    private void playPrevious(){if(currentMixIndex>=0)playMixIndex(currentMixIndex-1);else sendCommand("previous");}
    private void setupEffects(){releaseEffects();try{bassBoost=new BassBoost(0,player.getAudioSessionId());bassBoost.setEnabled(true);equalizer=new Equalizer(0,player.getAudioSessionId());equalizer.setEnabled(true);}catch(Exception ignored){}}
    private void applyPreset(){if(!prepared)return;try{if(bassBoost!=null)bassBoost.setStrength((short)(currentPreset==1?900:currentPreset==3?250:0));if(equalizer!=null){short bands=equalizer.getNumberOfBands();for(short i=0;i<bands;i++)equalizer.setBandLevel(i,(short)0);if(currentPreset==2&&bands>2){equalizer.setBandLevel((short)(bands/2),(short)Math.min(1000,equalizer.getBandLevelRange()[1]));}else if(currentPreset==1){for(short i=0;i<Math.min(2,bands);i++)equalizer.setBandLevel(i,(short)Math.min(1200,equalizer.getBandLevelRange()[1]));}}if(player!=null)player.setVolume(currentPreset==3?.65f:1f,currentPreset==3?.65f:1f);}catch(Exception ignored){}}
    private void applySpeed(){if(!prepared||player==null)return;try{player.setPlaybackParams(player.getPlaybackParams().setSpeed(playbackSpeed));}catch(Exception ignored){}}
    private void releaseEffects(){try{if(bassBoost!=null)bassBoost.release();}catch(Exception ignored){}try{if(equalizer!=null)equalizer.release();}catch(Exception ignored){}bassBoost=null;equalizer=null;}
    private File cachedFile(String url){File dir=new File(getFilesDir(),"offline_mix");if(!dir.exists())dir.mkdirs();String name=url.substring(url.lastIndexOf('/')+1).replaceAll("[^a-zA-Z0-9._-]","_");return new File(dir,name);}
    private void downloadFile(String url,File out){if(out.exists())return;File tmp=new File(out.getAbsolutePath()+".part");try(InputStream in=new URL(url).openStream();OutputStream os=new FileOutputStream(tmp)){byte[] buf=new byte[32768];int n;while((n=in.read(buf))>0)os.write(buf,0,n);if(tmp.length()>1024){tmp.renameTo(out);}}catch(Exception ignored){tmp.delete();}}
    private void downloadMix(){for(String url:MIX_URLS)downloadFile(url,cachedFile(url));handler.post(()->{notifyPlayer();sendState("downloaded");});}
    private void requestAudioFocus(){
        if(Build.VERSION.SDK_INT>=26){AudioFocusRequest req=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()).setOnAudioFocusChangeListener(this::onFocus).build();audioManager.requestAudioFocus(req);}else audioManager.requestAudioFocus(f->onFocus(f),AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN);
    }
    private void onFocus(int focus){if(focus==AudioManager.AUDIOFOCUS_LOSS||focus==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)pausePlayback();else if(focus==AudioManager.AUDIOFOCUS_GAIN&&player!=null&&prepared&&!isPlayingSafe())resumePlayback();else if(focus==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK&&player!=null)player.setVolume(.25f,.25f);}
    private void pausePlayback(){if(isPlayingSafe()){player.pause();updateState();notifyPlayer();sendState(null);}}
    private void resumePlayback(){if(player==null){android.content.SharedPreferences p=getSharedPreferences("playback",MODE_PRIVATE);String u=p.getString("url",null);if(u!=null){pendingSeek=p.getInt("position",0);playUrl(u,p.getString("title","Abhi Music"),p.getString("artist","Abhishek"),p.getString("artwork",""));}return;}if(prepared&&!isPlayingSafe()){player.start();updateState();notifyPlayer();sendState(null);}}
    private void stopPlayback(){if(player!=null&&prepared)player.stop();releasePlayer();session.setActive(false);stopForeground(true);stopSelf();sendState("stopped");}
    private void updateState(){boolean playing=isPlayingSafe();long pos=player==null?0:player.getCurrentPosition();session.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PAUSE|PlaybackState.ACTION_SEEK_TO|PlaybackState.ACTION_SKIP_TO_NEXT|PlaybackState.ACTION_SKIP_TO_PREVIOUS|PlaybackState.ACTION_STOP).setState(playing?PlaybackState.STATE_PLAYING:PlaybackState.STATE_PAUSED,pos,playing?1f:0f).build());}

    private Notification buildNotification(String subtitle){
        boolean playing=isPlayingSafe();
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Action prev=new Notification.Action(android.R.drawable.ic_media_previous,"Previous",servicePending(ACTION_PREVIOUS,1));
        Notification.Action toggle=new Notification.Action(playing?android.R.drawable.ic_media_pause:android.R.drawable.ic_media_play,playing?"Pause":"Play",servicePending(playing?ACTION_PAUSE:ACTION_RESUME,2));
        Notification.Action next=new Notification.Action(android.R.drawable.ic_media_next,"Next",servicePending(ACTION_NEXT,3));
        Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
        b.setSmallIcon(android.R.drawable.ic_media_play).setContentTitle(title).setContentText(subtitle==null?artist:subtitle).setContentIntent(open).setOngoing(playing).setShowWhen(false).setVisibility(Notification.VISIBILITY_PUBLIC).addAction(prev).addAction(toggle).addAction(next).setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0,1,2));
        if(albumArt!=null)b.setLargeIcon(albumArt);return b.build();
    }
    private PendingIntent servicePending(String action,int code){return PendingIntent.getService(this,code,intent(this,action),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);}
    private void notifyPlayer(){((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID,buildNotification(null));AbhiMusicWidget.update(this,title,artist,isPlayingSafe());}
    private void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel(CHANNEL,"Music playback",NotificationManager.IMPORTANCE_LOW);c.setDescription("Abhi Music background playback controls");c.setShowBadge(false);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);}}
    private void loadArtwork(){if(artwork.isEmpty())return;new Thread(()->{try{albumArt=BitmapFactory.decodeStream(new URL(artwork).openStream());handler.post(this::notifyPlayer);}catch(Exception ignored){}}).start();}
    private void sendCommand(String command){sendState(command);}
    private void sendState(String command){try{JSONObject o=new JSONObject();o.put("playing",isPlayingSafe());o.put("position",player==null?0:player.getCurrentPosition());o.put("duration",player==null?0:player.getDuration());if(command!=null)o.put("command",command);Intent i=new Intent(BROADCAST_STATE).setPackage(getPackageName()).putExtra("state",o.toString());sendBroadcast(i);}catch(Exception ignored){}}
    private final Runnable progressTask=new Runnable(){int ticks=0;@Override public void run(){if(player!=null){sendState(null);if(prepared&&++ticks%5==0)getSharedPreferences("playback",MODE_PRIVATE).edit().putInt("position",player.getCurrentPosition()).apply();}handler.postDelayed(this,1000);}};
    private void releasePlayer(){releaseEffects();if(player!=null){try{player.release();}catch(Exception ignored){}player=null;prepared=false;}}
    @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);releasePlayer();if(session!=null)session.release();super.onDestroy();}
    @Override public android.os.IBinder onBind(Intent intent){return super.onBind(intent);}
}

package com.abhishek.abhimusic;

import android.app.*;
import android.content.*;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.*;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.*;
import java.net.URL;
import org.json.JSONObject;

public class PlaybackService extends Service {
    public static final String BROADCAST_STATE="com.abhishek.abhimusic.PLAYBACK_STATE";
    public static final String ACTION_PLAY="play", ACTION_PAUSE="pause", ACTION_RESUME="resume", ACTION_SEEK="seek", ACTION_VOLUME="volume", ACTION_NEXT="next", ACTION_PREVIOUS="previous", ACTION_STOP="stop";
    private static final String CHANNEL="abhi_music_playback";
    private static final int NOTIFICATION_ID=8219;
    private MediaPlayer player;
    private MediaSession session;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private String title="Abhi Music",artist="Made by Abhishek",artwork="";
    private Bitmap albumArt;
    private AudioManager audioManager;
    private boolean prepared=false;
    private boolean isPlayingSafe(){try{return prepared&&isPlayingSafe();}catch(Exception e){return false;}}

    public static Intent intent(Context c,String action){return new Intent(c,PlaybackService.class).setAction(action);}

    @Override public void onCreate(){
        super.onCreate(); createChannel(); audioManager=(AudioManager)getSystemService(AUDIO_SERVICE);
        session=new MediaSession(this,"AbhiMusicSession");
        session.setCallback(new MediaSession.Callback(){
            @Override public void onPlay(){resumePlayback();}
            @Override public void onPause(){pausePlayback();}
            @Override public void onSeekTo(long pos){if(player!=null&&prepared)player.seekTo((int)pos);}
            @Override public void onSkipToNext(){sendCommand("next");}
            @Override public void onSkipToPrevious(){sendCommand("previous");}
            @Override public void onStop(){stopPlayback();}
        });
        session.setActive(true); handler.post(progressTask);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null)return START_STICKY;String action=intent.getAction();
        if(ACTION_PLAY.equals(action)){playUrl(intent.getStringExtra("url"),intent.getStringExtra("title"),intent.getStringExtra("artist"),intent.getStringExtra("artwork"));}
        else if(ACTION_PAUSE.equals(action))pausePlayback();
        else if(ACTION_RESUME.equals(action))resumePlayback();
        else if(ACTION_SEEK.equals(action)){if(player!=null&&prepared)player.seekTo(intent.getIntExtra("position",0));}
        else if(ACTION_VOLUME.equals(action)){if(player!=null&&prepared){float v=intent.getFloatExtra("volume",1f);player.setVolume(v,v);}}
        else if(ACTION_NEXT.equals(action))sendCommand("next");
        else if(ACTION_PREVIOUS.equals(action))sendCommand("previous");
        else if(ACTION_STOP.equals(action))stopPlayback();
        return START_STICKY;
    }

    private void playUrl(String url,String t,String a,String art){
        if(url==null)return;title=t==null?"Abhi Music":t;artist=a==null?"Abhishek":a;artwork=art==null?"":art;albumArt=null;
        releasePlayer(); requestAudioFocus();
        prepared=false;player=new MediaPlayer();
        player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
        player.setWakeMode(this,PowerManager.PARTIAL_WAKE_LOCK);
        player.setOnPreparedListener(mp->{prepared=true;mp.start();session.setMetadata(new android.media.MediaMetadata.Builder().putString(android.media.MediaMetadata.METADATA_KEY_TITLE,title).putString(android.media.MediaMetadata.METADATA_KEY_ARTIST,artist).putLong(android.media.MediaMetadata.METADATA_KEY_DURATION,mp.getDuration()).build());updateState();notifyPlayer();sendState(null);});
        player.setOnCompletionListener(mp->{sendState("next");updateState();});
        player.setOnErrorListener((mp,what,extra)->{sendState("error");return false;});
        try{player.setDataSource(url);startForeground(NOTIFICATION_ID,buildNotification("Loading…"));player.prepareAsync();loadArtwork();}catch(Exception e){sendState("error");stopSelf();}
    }

    private void requestAudioFocus(){
        if(Build.VERSION.SDK_INT>=26){AudioFocusRequest req=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()).setOnAudioFocusChangeListener(this::onFocus).build();audioManager.requestAudioFocus(req);}else audioManager.requestAudioFocus(f->onFocus(f),AudioManager.STREAM_MUSIC,AudioManager.AUDIOFOCUS_GAIN);
    }
    private void onFocus(int focus){if(focus==AudioManager.AUDIOFOCUS_LOSS||focus==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT)pausePlayback();else if(focus==AudioManager.AUDIOFOCUS_GAIN&&player!=null&&prepared&&!isPlayingSafe())resumePlayback();else if(focus==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK&&player!=null)player.setVolume(.25f,.25f);}
    private void pausePlayback(){if(isPlayingSafe()){player.pause();updateState();notifyPlayer();sendState(null);}}
    private void resumePlayback(){if(player!=null&&prepared&&!isPlayingSafe()){player.start();updateState();notifyPlayer();sendState(null);}}
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
    private void notifyPlayer(){((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION_ID,buildNotification(null));}
    private void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel(CHANNEL,"Music playback",NotificationManager.IMPORTANCE_LOW);c.setDescription("Abhi Music background playback controls");c.setShowBadge(false);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);}}
    private void loadArtwork(){if(artwork.isEmpty())return;new Thread(()->{try{albumArt=BitmapFactory.decodeStream(new URL(artwork).openStream());handler.post(this::notifyPlayer);}catch(Exception ignored){}}).start();}
    private void sendCommand(String command){sendState(command);}
    private void sendState(String command){try{JSONObject o=new JSONObject();o.put("playing",isPlayingSafe());o.put("position",player==null?0:player.getCurrentPosition());o.put("duration",player==null?0:player.getDuration());if(command!=null)o.put("command",command);Intent i=new Intent(BROADCAST_STATE).setPackage(getPackageName()).putExtra("state",o.toString());sendBroadcast(i);}catch(Exception ignored){}}
    private final Runnable progressTask=new Runnable(){@Override public void run(){if(player!=null)sendState(null);handler.postDelayed(this,1000);}};
    private void releasePlayer(){if(player!=null){try{player.release();}catch(Exception ignored){}player=null;prepared=false;}}
    @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);releasePlayer();if(session!=null)session.release();super.onDestroy();}
    @Override public android.os.IBinder onBind(Intent intent){return null;}
}

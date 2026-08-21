package com.abhishek.abhimusic;

import android.Manifest;
import android.app.Activity;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.View;
import android.webkit.*;
import android.widget.Toast;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://abhi-music-amber.vercel.app";
    private static final String APP_VERSION = "1.8.0";
    private static final int FILE_REQUEST = 4102;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private volatile boolean videoActive=false;

    private final BroadcastReceiver playbackReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            String json = intent.getStringExtra("state");
            if (json != null && webView != null) {
                String quoted = JSONObject.quote(json);
                webView.post(() -> webView.evaluateJavascript("window.onAbhiNativeState && window.onAbhiNativeState(" + quoted + ")", null));
            }
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(9,10,11));
        getWindow().setNavigationBarColor(Color.rgb(9,10,11));
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9,10,11));
        setContentView(webView);
        webView.setOnApplyWindowInsetsListener((view,insets)->{
            int top,bottom;
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(android.view.WindowInsets.Type.systemBars());top=bars.top;bottom=bars.bottom;}
            else{top=insets.getSystemWindowInsetTop();bottom=insets.getSystemWindowInsetBottom();}
            int extra=(int)(12*getResources().getDisplayMetrics().density);view.setPadding(0,top+extra,0,bottom);return insets;
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " AbhiMusicAndroid/" + APP_VERSION);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        if (Build.VERSION.SDK_INT >= 26) {
            webView.getSettings().setSafeBrowsingEnabled(true);
        }

        webView.addJavascriptInterface(new AndroidBridge(), "AbhiAndroid");
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.getHost() != null && (uri.getHost().endsWith("vercel.app") || uri.getHost().contains("abhi-music"))) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("document.documentElement.classList.add('native-apk');document.documentElement.dataset.nativeVersion='"+APP_VERSION+"';", null);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), FILE_REQUEST); }
                catch (Exception e) { fileCallback = null; Toast.makeText(MainActivity.this, "File picker unavailable", Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });

        IntentFilter filter = new IntentFilter(PlaybackService.BROADCAST_STATE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(playbackReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(playbackReceiver, filter);

        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 77);

        if (state == null) webView.loadUrl(APP_URL); else webView.restoreState(state);
    }

    public class AndroidBridge {
        @JavascriptInterface public void play(String url, String title, String artist, String artwork) {
            Intent i = PlaybackService.intent(MainActivity.this, PlaybackService.ACTION_PLAY);
            i.putExtra("url", url); i.putExtra("title", title); i.putExtra("artist", artist); i.putExtra("artwork", artwork);
            startForegroundServiceCompat(i);
        }
        @JavascriptInterface public void pause() { startForegroundServiceCompat(PlaybackService.intent(MainActivity.this, PlaybackService.ACTION_PAUSE)); }
        @JavascriptInterface public void resume() { startForegroundServiceCompat(PlaybackService.intent(MainActivity.this, PlaybackService.ACTION_RESUME)); }
        @JavascriptInterface public void seekTo(int millis) { Intent i=PlaybackService.intent(MainActivity.this,PlaybackService.ACTION_SEEK);i.putExtra("position",millis);startForegroundServiceCompat(i); }
        @JavascriptInterface public void setVolume(double volume) { Intent i=PlaybackService.intent(MainActivity.this,PlaybackService.ACTION_VOLUME);i.putExtra("volume",(float)volume);startForegroundServiceCompat(i); }
        @JavascriptInterface public void setVideoActive(boolean active) { videoActive=active; }
        @JavascriptInterface public void enterPip() { runOnUiThread(()->enterPipMode()); }
        @JavascriptInterface public void setPreset(int preset) { Intent i=PlaybackService.intent(MainActivity.this,PlaybackService.ACTION_PRESET);i.putExtra("preset",preset);startForegroundServiceCompat(i); }
        @JavascriptInterface public void setSpeed(double speed) { Intent i=PlaybackService.intent(MainActivity.this,PlaybackService.ACTION_SPEED);i.putExtra("speed",(float)speed);startForegroundServiceCompat(i); }
        @JavascriptInterface public void downloadMix() { startForegroundServiceCompat(PlaybackService.intent(MainActivity.this, PlaybackService.ACTION_DOWNLOAD_MIX)); }
        @JavascriptInterface public void openBatterySettings() { runOnUiThread(()->{try{startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}catch(Exception e){startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));}}); }
        @JavascriptInterface public void checkForUpdates() { runOnUiThread(()->Toast.makeText(MainActivity.this,"Abhi Music "+APP_VERSION+" · check GitHub Releases for the latest APK",Toast.LENGTH_LONG).show()); }
        @JavascriptInterface public String getVersion() { return APP_VERSION + " · Android Auto · Native"; }
        @JavascriptInterface public boolean isNativeApp() { return true; }
    }

    private void startForegroundServiceCompat(Intent i) {
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == FILE_REQUEST && fileCallback != null) {
            Uri[] resultUris = WebChromeClient.FileChooserParams.parseResult(result, data);
            fileCallback.onReceiveValue(resultUris); fileCallback = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle out) { webView.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    private void enterPipMode(){if(videoActive&&Build.VERSION.SDK_INT>=26&&!isInPictureInPictureMode()){try{android.app.PictureInPictureParams p=new android.app.PictureInPictureParams.Builder().setAspectRatio(new android.util.Rational(16,9)).build();enterPictureInPictureMode(p);}catch(Exception e){Toast.makeText(this,"Enable Picture-in-Picture for Abhi Music in Android settings",Toast.LENGTH_LONG).show();}}}
    @Override protected void onUserLeaveHint(){super.onUserLeaveHint();enterPipMode();}
    @Override protected void onPause(){super.onPause();if(videoActive&&Build.VERSION.SDK_INT>=26)new Handler(Looper.getMainLooper()).postDelayed(this::enterPipMode,120);}
    @Override public void onPictureInPictureModeChanged(boolean inPip,android.content.res.Configuration config){super.onPictureInPictureModeChanged(inPip,config);if(webView!=null)webView.evaluateJavascript("document.documentElement.classList."+(inPip?"add":"remove")+"('pip-mode')",null);}
    @Override protected void onDestroy() { try { unregisterReceiver(playbackReceiver); } catch(Exception ignored) {} super.onDestroy(); }
}

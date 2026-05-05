package com.covertone.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int PERM_REQ = 1001;
    private static WebView staticWebView;

    public static void evalJS(String script) {
        if (staticWebView != null) {
            staticWebView.post(() -> staticWebView.evaluateJavascript(script, null));
        }
    }

    private static void dispatchMediaAction(String action) {
        String json = org.json.JSONObject.quote(action);
        evalJS("document.dispatchEvent(new CustomEvent('native-mediasession',{detail:" + json + "}))");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView wv = this.bridge.getWebView();
        staticWebView = wv;
        wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
        wv.addJavascriptInterface(new MediaBridge(), "NativeMedia");

        Intent intent = getIntent();
        if (intent != null) {
            String act = intent.getStringExtra("media_action");
            if (act != null) {
                dispatchMediaAction(act);
            }
        }

        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERM_REQ);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String act = intent.getStringExtra("media_action");
        if (act == null) return;
        dispatchMediaAction(act);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        staticWebView = null;
    }

    public class MediaBridge {
        private void ensureService() {
            if (!PlaybackService.isRunning()) {
                Intent si = new Intent(MainActivity.this, PlaybackService.class);
                if (Build.VERSION.SDK_INT >= 26) {
                    startForegroundService(si);
                } else {
                    startService(si);
                }
            }
        }

        @JavascriptInterface
        public void setPlaying(String title, String artist) {
            ensureService();
            PlaybackService.update(title, artist, true, null);
        }

        @JavascriptInterface
        public void setPaused(String title, String artist) {
            PlaybackService.update(title, artist, false, null);
        }

        @JavascriptInterface
        public void hide() {
            PlaybackService.hideNotification();
        }

        @JavascriptInterface
        public void setArtwork(String imageUrl) {
            ensureService();
            PlaybackService.update("", "", true, imageUrl);
        }
    }
}

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
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

import java.lang.ref.WeakReference;

public class MainActivity extends BridgeActivity {

    private void updateInsets() {
        WebView wv = webViewRef.get();
        if (wv == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(wv, (v, insets) -> {
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            String js = "document.documentElement.style.setProperty('--safe-area-inset-top', '"
                    + top + "px');"
                    + "document.documentElement.style.setProperty('--safe-area-inset-bottom', '"
                    + bottom + "px');";
            wv.evaluateJavascript(js, null);
            return insets;
        });
    }

    private static final int PERM_REQ = 1001;
    private static WeakReference<WebView> webViewRef = new WeakReference<>(null);

    public static void evalJS(String script) {
        WebView wv = webViewRef.get();
        if (wv != null) {
            wv.post(() -> wv.evaluateJavascript(script, null));
        }
    }

    private static void dispatchMediaAction(String action) {
        String json = org.json.JSONObject.quote(action);
        evalJS("document.dispatchEvent(new CustomEvent('native-mediasession',{detail:" + json + "}))");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WebView wv = this.bridge.getWebView();
        webViewRef = new WeakReference<>(wv);
        updateInsets();
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
        webViewRef.clear();
    }

    public class MediaBridge {
        private void ensureService() {
            Intent si = new Intent(MainActivity.this, PlaybackService.class);
            if (Build.VERSION.SDK_INT >= 26) {
                startForegroundService(si);
            } else {
                startService(si);
            }
        }

        @JavascriptInterface
        public void setPlaying(String title, String artist, String artworkUrl) {
            ensureService();
            PlaybackService.update(title, artist, true, artworkUrl);
        }

        @JavascriptInterface
        public void setPaused(String title, String artist, String artworkUrl) {
            PlaybackService.update(title, artist, false, artworkUrl);
        }

        @JavascriptInterface
        public void hide() {
            PlaybackService.hideNotification();
        }

        @JavascriptInterface
        public void setArtwork(String imageUrl) {
            ensureService();
            PlaybackService.updateArtwork(imageUrl);
        }
    }
}

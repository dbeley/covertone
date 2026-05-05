package com.covertone.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PlaybackService extends Service {

    private static final String TAG = "CovertonePlayback";
    private static final String CHANNEL_ID = "covertone_playback";
    private static final int NOTIFY_ID = 1;
    private static final int ARTWORK_MAX_SIZE_PX = 256;

    private static final int REQ_OPEN = 100;
    private static final int REQ_PREV = 101;
    private static final int REQ_PLAY = 102;
    private static final int REQ_PAUSE = 103;
    private static final int REQ_NEXT = 104;
    private static final int REQ_STOP = 105;

    private static PlaybackService instance;
    private static volatile PendingUpdate pendingUpdate;

    private static class PendingUpdate {
        final String title;
        final String artist;
        final boolean playing;
        final String artworkUrl;
        PendingUpdate(String t, String a, boolean p, String u) {
            title = t; artist = a; playing = p; artworkUrl = u;
        }
    }

    private MediaSessionCompat mediaSession;
    private ExecutorService artworkExecutor;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String currentTitle = "";
    private String currentArtist = "";
    private boolean isPlaying = false;
    private Bitmap coverBitmap;

    public static boolean isRunning() {
        return instance != null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        instance = this;
        artworkExecutor = Executors.newSingleThreadExecutor();

        createNotificationChannel();
        createMediaSession();
        startForegroundWithPlaceholder();

        PendingUpdate pending = pendingUpdate;
        if (pending != null) {
            Log.d(TAG, "Applying pending update in onCreate");
            pendingUpdate = null;
            update(pending.title, pending.artist, pending.playing, pending.artworkUrl);
        }
    }

    private void createNotificationChannel() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = getSystemService(NotificationManager.class);
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Now playing");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        } catch (Exception e) {
            Log.w(TAG, "createNotificationChannel failed", e);
        }
    }

    private void createMediaSession() {
        try {
            mediaSession = new MediaSessionCompat(this, "Covertone");
            mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);

            mediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override public void onPlay()     { fire("play"); }
                @Override public void onPause()    { fire("pause"); }
                @Override public void onSkipToNext()     { fire("next"); }
                @Override public void onSkipToPrevious() { fire("prev"); }
                @Override public void onStop()           { fire("stop"); }
            });

            mediaSession.setActive(true);
        } catch (Exception e) {
            Log.w(TAG, "createMediaSession failed", e);
        }
    }

    private void startForegroundWithPlaceholder() {
        try {
            Notification placeholder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle("Covertone")
                .setContentText("Loading...")
                .setOngoing(true)
                .build();

            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFY_ID, placeholder,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFY_ID, placeholder);
            }
            Log.d(TAG, "startForeground placeholder OK");
        } catch (Exception e) {
            Log.e(TAG, "startForeground placeholder failed", e);
        }
    }

    public static void update(String title, String artist, boolean playing, String artworkUrl) {
        Log.d(TAG, "update called: playing=" + playing);
        PlaybackService svc = instance;
        if (svc == null) {
            Log.d(TAG, "Service not ready, queuing update");
            pendingUpdate = new PendingUpdate(title, artist, playing, artworkUrl);
            return;
        }

        if (title != null && !title.isEmpty()) {
            svc.currentTitle = title;
        }
        if (artist != null && !artist.isEmpty()) {
            svc.currentArtist = artist;
        }
        svc.isPlaying = playing;

        svc.mainHandler.post(svc::doUpdate);

        if (artworkUrl != null && !artworkUrl.isEmpty()) {
            svc.loadArtwork(artworkUrl);
        }
    }

    public static void hideNotification() {
        Log.d(TAG, "hideNotification");
        PlaybackService svc = instance;
        if (svc == null) return;

        svc.isPlaying = false;
        svc.mainHandler.post(() -> {
            svc.doUpdate();
            try {
                svc.stopForeground(true);
            } catch (Exception e) {
                Log.w(TAG, "stopForeground failed", e);
            }
            svc.stopSelf();
        });
    }

    private void doUpdate() {
        if (mediaSession == null) return;

        int state = isPlaying
            ? PlaybackStateCompat.STATE_PLAYING
            : PlaybackStateCompat.STATE_PAUSED;

        try {
            mediaSession.setMetadata(new android.support.v4.media.MediaMetadataCompat.Builder()
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putBitmap(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ALBUM_ART, coverBitmap)
                .build());

            mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY |
                    PlaybackStateCompat.ACTION_PAUSE |
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                    PlaybackStateCompat.ACTION_STOP)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build());
        } catch (Exception e) {
            Log.w(TAG, "MediaSession update failed", e);
            return;
        }

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setOngoing(isPlaying)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(makeOpenIntent())
            .setStyle(new MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2))
            .addAction(android.R.drawable.ic_media_previous, "Prev", makeActionIntent("prev", REQ_PREV))
            .addAction(
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying ? "Pause" : "Play",
                makeActionIntent(isPlaying ? "pause" : "play", isPlaying ? REQ_PAUSE : REQ_PLAY))
            .addAction(android.R.drawable.ic_media_next, "Next", makeActionIntent("next", REQ_NEXT))
            .addAction(android.R.drawable.ic_delete, "Stop", makeActionIntent("stop", REQ_STOP))
            .setLargeIcon(coverBitmap)
            .build();

        try {
            if (isPlaying) {
                if (Build.VERSION.SDK_INT >= 29) {
                    startForeground(NOTIFY_ID, notif,
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFY_ID, notif);
                }
            } else {
                stopForeground(false);
                NotificationManager nm = getSystemService(NotificationManager.class);
                if (nm != null) nm.notify(NOTIFY_ID, notif);
            }
        } catch (Exception e) {
            Log.e(TAG, "Notification update failed", e);
        }
    }

    private void loadArtwork(String artworkUrl) {
        artworkExecutor.execute(() -> {
            HttpURLConnection c = null;
            InputStream is = null;
            try {
                URL url = new URL(artworkUrl);
                c = (HttpURLConnection) url.openConnection();
                c.setDoInput(true);
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                c.connect();
                is = c.getInputStream();

                BitmapFactory.Options opts = new BitmapFactory.Options();
                opts.inJustDecodeBounds = true;
                BitmapFactory.decodeStream(is, null, opts);
                is.close();

                int scale = 1;
                while (opts.outWidth / scale > ARTWORK_MAX_SIZE_PX || opts.outHeight / scale > ARTWORK_MAX_SIZE_PX) {
                    scale *= 2;
                }

                c = (HttpURLConnection) url.openConnection();
                c.setDoInput(true);
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                c.connect();
                is = c.getInputStream();
                opts.inJustDecodeBounds = false;
                opts.inSampleSize = scale;
                Bitmap bmp = BitmapFactory.decodeStream(is, null, opts);
                is.close();
                c.disconnect();
                c = null;

                if (bmp != null) {
                    coverBitmap = bmp;
                    mainHandler.post(this::doUpdate);
                }
            } catch (Exception ignored) {
            } finally {
                if (is != null) {
                    try { is.close(); } catch (Exception ignored) {}
                }
                if (c != null) {
                    c.disconnect();
                }
            }
        });
    }

    private void fire(String action) {
        String json = org.json.JSONObject.quote(action);
        MainActivity.evalJS(
            "document.dispatchEvent(new CustomEvent('native-mediasession',{detail:" + json + "}))");
    }

    private PendingIntent makeActionIntent(String action, int requestCode) {
        Intent i = new Intent(this, MainActivity.class).putExtra("media_action", action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, requestCode, i, flags);
    }

    private PendingIntent makeOpenIntent() {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, REQ_OPEN, i, flags);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand");
        if (intent == null) {
            Log.w(TAG, "onStartCommand with null intent — stopping");
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        if (artworkExecutor != null) {
            artworkExecutor.shutdownNow();
        }
        if (mediaSession != null) {
            try {
                mediaSession.release();
            } catch (Exception e) {
                Log.w(TAG, "mediaSession release failed", e);
            }
            mediaSession = null;
        }
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }
}

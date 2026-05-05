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
import android.os.IBinder;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PlaybackService extends Service {

    private static final String CHANNEL_ID = "covertone_playback";
    private static final int NOTIFY_ID = 1;
    private static final int ARTWORK_MAX_SIZE_PX = 256;

    private static PlaybackService instance;
    private final ExecutorService artworkExecutor = Executors.newSingleThreadExecutor();
    private MediaSessionCompat mediaSession;
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
        instance = this;

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Now playing");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

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

            private void fire(String action) {
                String json = org.json.JSONObject.quote(action);
                MainActivity.evalJS(
                    "document.dispatchEvent(new CustomEvent('native-mediasession',{detail:" + json + "}))");
            }
        });

        mediaSession.setActive(true);
    }

    public static void update(String title, String artist, boolean playing, String artworkUrl) {
        if (instance == null) return;
        if (title != null && !title.isEmpty()) {
            instance.currentTitle = title;
        }
        if (artist != null && !artist.isEmpty()) {
            instance.currentArtist = artist;
        }
        instance.isPlaying = playing;
        instance.doUpdate();

        if (artworkUrl != null && !artworkUrl.isEmpty()) {
            instance.artworkExecutor.execute(() -> {
                try {
                    URL url = new URL(artworkUrl);
                    HttpURLConnection c = (HttpURLConnection) url.openConnection();
                    c.setDoInput(true);
                    c.setConnectTimeout(10000);
                    c.setReadTimeout(10000);
                    c.connect();
                    InputStream is = c.getInputStream();

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

                    if (instance != null) {
                        instance.coverBitmap = bmp;
                        android.os.Handler mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
                        mainHandler.post(() -> {
                            if (instance != null) instance.doUpdate();
                        });
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    public static void hideNotification() {
        if (instance != null) {
            instance.isPlaying = false;
            instance.stopForeground(true);
            instance.stopSelf();
        }
    }

    private void doUpdate() {
        int state = isPlaying
            ? PlaybackStateCompat.STATE_PLAYING
            : PlaybackStateCompat.STATE_PAUSED;

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
            .addAction(android.R.drawable.ic_media_previous, "Prev", makeActionIntent("prev"))
            .addAction(
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                isPlaying ? "Pause" : "Play",
                makeActionIntent(isPlaying ? "pause" : "play"))
            .addAction(android.R.drawable.ic_media_next, "Next", makeActionIntent("next"))
            .addAction(android.R.drawable.ic_delete, "Stop", makeActionIntent("stop"))
            .setLargeIcon(coverBitmap)
            .build();

        if (isPlaying) {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFY_ID, notif,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFY_ID, notif);
            }
        } else {
            stopForeground(false);
            getSystemService(NotificationManager.class).notify(NOTIFY_ID, notif);
        }
    }

    private PendingIntent makeActionIntent(String action) {
        Intent i = new Intent(this, MainActivity.class).putExtra("media_action", action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, action.hashCode(), i, flags);
    }

    private PendingIntent makeOpenIntent() {
        Intent i = new Intent(this, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, 0, i, flags);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        artworkExecutor.shutdownNow();
        super.onDestroy();
    }
}

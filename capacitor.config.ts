import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.covertone.app',
  appName: 'Covertone',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
};

export default config;

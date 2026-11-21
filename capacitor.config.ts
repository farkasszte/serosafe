import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.serosafe.app',
  appName: 'SeroSafe',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f5f6f2',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f5f6f2',
  },
};

export default config;

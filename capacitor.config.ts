import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tidenote.app',
  appName: 'TideNote',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0891B2',
      showSpinner: false
    },
    Keyboard: {
      resize: 'native'
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    },
    SystemBars: {
      insetsHandling: 'disable'
    }
  }
};

export default config;

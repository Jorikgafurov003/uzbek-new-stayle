import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uzbechka.delivery',
  appName: 'Uzbechka',
  webDir: 'dist',
  server: {
    // This allows the app to connect to the hosted API
    cleartext: true,
    allowNavigation: [
      'ais-dev-cu5xt2gwtzi4ezh5kdhta5-384858912045.asia-southeast1.run.app',
      'ais-pre-cu5xt2gwtzi4ezh5kdhta5-384858912045.asia-southeast1.run.app'
    ]
  }
};

export default config;

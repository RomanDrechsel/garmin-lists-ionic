import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "de.romandrechsel.lists.dev",
    appName: "Lists",
    webDir: "www/browser",
    server: {
        androidScheme: "https",
        cleartext: true,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 500,
            launchAutoHide: true,
            launchFadeOutDuration: 200,
            backgroundColor: "#008DF5FF",
            androidSplashResourceName: "splash",
            androidScaleType: "CENTER_CROP",
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: true,
            layoutName: "launch_screen",
            useDialog: true,
        },
        StatusBar: {
            overlaysWebView: false,
        },
    },
    android: {
        useLegacyBridge: true,
    },
};

export default config;

import { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
    appId: "de.romandrechsel.lists.dev",
    appName: "Lists",
    webDir: "www/browser",
    loggingBehavior: "debug",
    zoomEnabled: false,
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
        Keyboard: {
            resize: KeyboardResize.Body,
            style: KeyboardStyle.Default,
            resizeOnFullScreen: false,
        },
        EdgeToEdge: {
            backgroundColor: "#73bbff",
        },
        CapacitorSQLite: {
            androidIsEncryption: true,
            androidBiometric: {
                biometricAuth: false,
                biometricTitle: "Biometric login for capacitor sqlite",
                biometricSubTitle: "Log in using your biometric",
            },
        },
    },
};

export default config;

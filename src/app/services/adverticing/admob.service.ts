import { Injectable } from "@angular/core";
import { AdMob, AdMobBannerSize, AdmobConsentDebugGeography, AdmobConsentRequestOptions, AdmobConsentStatus, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { Keyboard } from "@capacitor/keyboard";
import { environment } from "../../../environments/environment";
import { Logger } from "../logging/logger";

@Injectable({
    providedIn: "root",
})
export class AdmobService {
    private _bannerIsShown: boolean = false;

    private _bannerHeight: number = 56;

    public async Initialize() {
        await AdMob.initialize({
            initializeForTesting: environment.publicRelease !== true,
            testingDevices: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
        });

        const authorizationStatus = await AdMob.trackingAuthorizationStatus();

        Logger.Debug(`Admob tracking authorization status: ${authorizationStatus.status}`);
        if (authorizationStatus.status === "notDetermined") {
            await AdMob.requestTrackingAuthorization();
        }

        let options: AdmobConsentRequestOptions = {};
        if (environment.publicRelease !== true) {
            options = {
                debugGeography: AdmobConsentDebugGeography.EEA,
                testDeviceIdentifiers: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
            };
        }

        const consentInfo = await AdMob.requestConsentInfo(options);
        if (authorizationStatus.status === "authorized" && consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
            const confirm = await AdMob.showConsentForm();
            Logger.Debug(`Admob consent info: `, confirm.status);
        }

        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            Logger.Debug(`Admob banner loaded`);
            this._bannerIsShown = true;
        });

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
            if (this._bannerHeight != size.height) {
                Logger.Debug(`Admob banner size changed: `, size);
                this.resizeContainer(size.height);
            }
            if (size.height != 0) {
                this._bannerHeight = size.height;
            }
        });

        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
            Logger.Error(`Admob banner error: `, error);
            this._bannerIsShown = false;
        });

        if (environment.publicRelease === true) {
            Logger.Debug(`Admob initialized`);
        } else {
            Logger.Debug(`Admob initialized in test mode`);
        }

        Keyboard.addListener("keyboardDidShow", async info => {
            await this.HideBanner();
        });
        Keyboard.addListener("keyboardDidHide", async () => {
            await this.ResumeBanner();
        });
    }

    public async ShowBanner() {
        if (this._bannerIsShown === false) {
            const options: BannerAdOptions = {
                adId: "ca-app-pub-4693945059643494/5993520446",
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: environment.publicRelease !== true,
                // npa: true
            };
            await AdMob.showBanner(options);
        }
    }

    public async HideBanner() {
        if (this._bannerIsShown === true) {
            await AdMob.hideBanner();
        }
        this._bannerIsShown = false;
    }

    private async ResumeBanner() {
        await AdMob.resumeBanner();
        this.resizeContainer(this._bannerHeight);
    }

    private resizeContainer(height: number) {
        const container = document.querySelector("ion-app") as HTMLElement;
        if (container) {
            container.style.marginBottom = height + "px";
        }
    }
}

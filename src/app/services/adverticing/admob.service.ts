import { Injectable } from "@angular/core";
import { AdMob, AdMobBannerSize, AdmobConsentDebugGeography, AdmobConsentInfo, AdmobConsentRequestOptions, AdmobConsentStatus, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { Keyboard } from "@capacitor/keyboard";
import { environment } from "../../../environments/environment";
import { Logger } from "../logging/logger";

@Injectable({
    providedIn: "root",
})
export class AdmobService {
    /** is the banner currently shown */
    private _bannerIsShown: boolean = false;

    /** last height of the banner in px */
    private _bannerHeight: number = 56;

    public async Initialize() {
        await AdMob.initialize({
            initializeForTesting: environment.publicRelease !== true,
            testingDevices: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
        });

        await this.RequestConsent(false);

        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            Logger.Debug(`Admob banner loaded`);
            this._bannerIsShown = true;
        });

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
            if (this._bannerHeight != size.height) {
                Logger.Debug(`Admob banner size changed: `, size);
            }
            if (size.height != 0) {
                this._bannerHeight = size.height;
            }
            console.log("new height " + size.height);
            this.resizeContainer(size.height);
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
            await this.resumeBanner();
        });
    }

    /**
     * Shows the Admob banner if it's not already shown.
     */
    public async ShowBanner() {
        if (this._bannerIsShown === false) {
            const options: BannerAdOptions = {
                adId: "ca-app-pub-4693945059643494/5993520446",
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: environment.publicRelease !== true,
                //npa: true
            };
            await AdMob.showBanner(options);
            console.log("show admob banner");
        }
    }

    /**
     * Hides the Admob banner if it's currently shown.
     */
    public async HideBanner() {
        if (this._bannerIsShown === true) {
            await AdMob.hideBanner();
        }
        this._bannerIsShown = false;
        console.log("hide admob banner");
    }

    /**
     * Requests consent for personalized advertising.     *
     * @param force_form If true, forces the consent form to be shown even if it's not required.
     * @returns true if consent is obtained or not required, false otherwise.
     */
    public async RequestConsent(force_form: boolean = true): Promise<boolean> {
        const authorizationStatus = (await AdMob.trackingAuthorizationStatus()).status;
        Logger.Debug(`Admob tracking authorization status: ${authorizationStatus}`);

        if (authorizationStatus === "notDetermined" || force_form) {
            await AdMob.requestTrackingAuthorization();
        }

        if ((await AdMob.trackingAuthorizationStatus()).status == "authorized") {
            const consentInfo = await this.getConsentStatus();
            let status = consentInfo.status;
            if (consentInfo.isConsentFormAvailable && (status === AdmobConsentStatus.REQUIRED || force_form)) {
                status = (await AdMob.showConsentForm()).status;
            }
            Logger.Debug(`Admob consent status: ${status}`);
            return status === AdmobConsentStatus.OBTAINED || status == AdmobConsentStatus.NOT_REQUIRED;
        } else {
            return false;
        }
    }

    /**
     * Retrieves the current consent status for personalized advertising.
     *
     * @returns  object containing the current consent status.
     */
    private async getConsentStatus(): Promise<AdmobConsentInfo> {
        let options: AdmobConsentRequestOptions = {};
        if (environment.publicRelease !== true) {
            options = {
                debugGeography: AdmobConsentDebugGeography.EEA,
                testDeviceIdentifiers: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
            };
        }
        const info = AdMob.requestConsentInfo(options);
        console.log(info);
        return info;
    }

    /** resumes the banner */
    private async resumeBanner() {
        await AdMob.resumeBanner();
        this._bannerIsShown = true;
        this.resizeContainer(this._bannerHeight);
    }

    /**
     * resizes the space for the banner
     * @param height banner height in px
     */
    private resizeContainer(height: number) {
        const container = document.querySelector("ion-app") as HTMLElement;
        if (container) {
            container.style.marginBottom = height + "px";
            console.log(container.style.marginBottom, height);
        }
    }
}

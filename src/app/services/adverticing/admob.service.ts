import { inject, Injectable } from "@angular/core";
import { AdMob, AdMobBannerSize, AdmobConsentDebugGeography, AdmobConsentInfo, AdmobConsentRequestOptions, AdmobConsentStatus, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { Keyboard } from "@capacitor/keyboard";
import { environment } from "../../../environments/environment";
import { Logger } from "../logging/logger";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class AdmobService {
    /** is the banner currently shown */
    private _bannerIsShown: boolean = false;

    /** last height of the banner in px */
    private _bannerHeight: number = 56;

    private _isInitialized: boolean = false;

    private readonly Preferences = inject(PreferencesService);

    public get Initialized(): boolean {
        return this._isInitialized;
    }

    public async Initialize() {
        this._isInitialized = false;

        await AdMob.initialize({
            initializeForTesting: environment.publicRelease !== true,
            testingDevices: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
        });

        await this.RequestConsent(false);
        this._bannerHeight = await this.Preferences.Get(EPrefProperty.AdmobBannerHeight, this._bannerHeight);
        this.resizeContainer(this._bannerHeight);

        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            Logger.Debug(`Admob banner loaded`);
            this._bannerIsShown = true;
        });

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
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

        Keyboard.addListener("keyboardWillShow", async info => {
            if (window.innerHeight < 350) {
                await this.HideBanner();
            }
        });
        Keyboard.addListener("keyboardDidHide", async () => {
            await this.resumeBanner();
        });

        this._isInitialized = true;

        await this.ShowBanner();
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
            try {
                await AdMob.removeBanner();
                await AdMob.showBanner(options);
            } catch {
                await AdMob.resumeBanner();
            }
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
            let consentInfo = await this.getConsentStatus();
            const before = consentInfo.status;
            if (consentInfo.isConsentFormAvailable && (consentInfo.status === AdmobConsentStatus.REQUIRED || force_form)) {
                Logger.Debug(`Show Admob ConsentForm...`);
                consentInfo = await AdMob.showConsentForm();
            }
            if (before !== consentInfo.status) {
                Logger.Debug(`Admob consent status changed: `, consentInfo);
            }

            return consentInfo.status === AdmobConsentStatus.OBTAINED || consentInfo.status == AdmobConsentStatus.NOT_REQUIRED;
        } else {
            return false;
        }
    }

    /**
     * Retrieves the current consent status for personalized advertising.
     *
     * @returns  object containing the current consent status.
     */
    public async getConsentStatus(): Promise<AdmobConsentInfo> {
        let options: AdmobConsentRequestOptions = {};
        if (environment.publicRelease !== true) {
            options = {
                debugGeography: AdmobConsentDebugGeography.EEA,
                testDeviceIdentifiers: ["edfcf89c-603c-45fa-a1c8-f77b771ee68c"],
            };
        }
        return AdMob.requestConsentInfo(options);
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
            if (height > 0) {
                if (this._bannerHeight !== height) {
                    Logger.Debug(`Admob banner height changed to ${height}px`);
                }
                this._bannerHeight = height;
                this.Preferences.Set(EPrefProperty.AdmobBannerHeight, height);
            }
            container.style.marginBottom = height + "px";
        }
    }
}

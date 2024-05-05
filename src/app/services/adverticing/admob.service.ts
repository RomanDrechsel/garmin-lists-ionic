import { Injectable } from '@angular/core';
import { AdMob, AdMobBannerSize, AdmobConsentStatus, BannerAdOptions, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from "@capacitor-community/admob";
import { Logger } from "../logging/logger";

@Injectable({
    providedIn: 'root'
})
export class AdmobService {

    public async Initialize() {
        await AdMob.initialize();

        const [trackingInfo, consentInfo] = await Promise.all([
            AdMob.trackingAuthorizationStatus(),
            AdMob.requestConsentInfo(),
        ]);

        if (trackingInfo.status === 'notDetermined') {
            await AdMob.requestTrackingAuthorization();
        }

        const authorizationStatus = await AdMob.trackingAuthorizationStatus();
        if (authorizationStatus.status === 'authorized' && consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
            await AdMob.showConsentForm();
        }
    }

    public async ShowBanner() {
        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
            Logger.Debug(`Admob banner loaded`);
        });

        AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
            Logger.Debug(`Admob banner size changed`, size);
        });

        const options: BannerAdOptions = {
            adId: 'ca-app-pub-4693945059643494/5993520446',
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: true,
            // npa: true
        };
        AdMob.showBanner(options);
    }
}

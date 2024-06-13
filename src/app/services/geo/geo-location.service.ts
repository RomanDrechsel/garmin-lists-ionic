import { Injectable, inject, isDevMode } from "@angular/core";
import { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { registerPlugin } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import * as L from "leaflet";
import { Subscription, interval } from "rxjs";
import { Locale } from "../localization/locale";
import { Logger } from "../logging/logger";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { GeoLocation } from "./geo-location";

@Injectable({
    providedIn: "root",
})
export class GeoLocationService {
    private _plugin = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
    private readonly Preferences = inject(PreferencesService);
    private _currentLocation?: GeoLocation;
    private _enabled = false;

    /** check location every 30 seconds */
    private readonly _timerInterval = isDevMode() ? 10000 : 30000;

    private _timerSubscription?: Subscription;

    public async Initialize() {
        this._enabled = await this.Preferences.Get<boolean>(EPrefProperty.AllowGeoFencing, false);
        if (this._enabled) {
            this.start();
        } else {
            this.stop();
            await this.Preferences.Set(EPrefProperty.AllowGeoFencing, false);
        }

        this.Preferences.onPrefChanged$.subscribe(async prop => {
            if (prop.prop == EPrefProperty.AllowGeoFencing) {
                this._enabled = prop.value as boolean;
                if (this._enabled) {
                    this.start();
                } else {
                    this.stop();
                }
            }
        });
    }

    public async GetCurrentLocation(timeout: number = 5000): Promise<GeoLocation | undefined> {
        if (!this._enabled) {
            return undefined;
        }
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: timeout, maximumAge: 10000 });
        this._currentLocation = new GeoLocation(position.coords.latitude, position.coords.longitude, Locale.getText("service-geo.currentLocation"));
        Logger.Console(`Current location is `, this._currentLocation);
        return this._currentLocation;
    }

    public getCurrentLocationSnapshot(): GeoLocation | undefined {
        return this._currentLocation;
    }

    public async getCoodinates(address: string | null | undefined): Promise<GeoLocation | undefined> {
        if (!address) {
            return undefined;
        }

        return new Promise<GeoLocation | undefined>((resolve, reject) => {
            const geocoder = (L.Control as any).Geocoder.nominatim();
            geocoder.geocode(address, (results: any) => {
                if (results.length === 0) {
                    resolve(undefined);
                    return;
                }
                const result = results[0];
                if (result) {
                    resolve(new GeoLocation(result.center.lat, result.center.lng, result.name));
                }
            });
        });
    }

    private async start() {
        const hasPermission = await Geolocation.checkPermissions();
        if (hasPermission.location == "denied") {
            await this.stop();
            return;
        }

        let granted = hasPermission.location == "granted";
        if (!granted) {
            const status = await Geolocation.requestPermissions({ permissions: ["location"] });
            granted = status.location == "granted";
        }

        if (granted) {
            this._timerSubscription = interval(this._timerInterval).subscribe(async () => {
                await this.GetCurrentLocation(5000);
            });
            await this.GetCurrentLocation(1000);
        }
    }

    private async stop() {
        this._enabled = false;
        this._timerSubscription?.unsubscribe();
    }
}

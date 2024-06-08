import { Injectable } from "@angular/core";
import { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { registerPlugin } from "@capacitor/core";
import { Logger } from "../logging/logger";
import { GeoLocation } from "./geo-location";

@Injectable({
    providedIn: "root",
})
export class GeoLocationService {
    private _plugin = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
    private _currentLocation?: GeoLocation;

    public async GetCurrentLocation(timeout: number = 5000): Promise<GeoLocation | undefined> {
        return new Promise((resolve, reject) => {
            const self = this;
            this._plugin
                .addWatcher(
                    {
                        requestPermissions: true,
                        stale: true,
                    },
                    function (location) {
                        if (location) {
                            self._currentLocation = location as GeoLocation;
                        }
                    },
                )
                .then(function (id) {
                    setTimeout(function () {
                        Logger.Debug(`Current Geo-location is`, self._currentLocation);
                        resolve(self._currentLocation);
                        self._plugin.removeWatcher({ id });
                    }, timeout);
                })
                .catch(err => {
                    Logger.Error(`Could not define geolocation:`, err);
                    resolve(undefined);
                });
        });
    }

    public getCurrentLocationSnapshot(): GeoLocation | undefined {
        return this._currentLocation;
    }
}

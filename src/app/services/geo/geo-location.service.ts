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

    public async GetCurrentLocation(timeout: number = 5000): Promise<GeoLocation | undefined> {
        return new Promise((resolve, reject) => {
            let last_location: GeoLocation | undefined = undefined;
            const self = this;
            this._plugin
                .addWatcher(
                    {
                        requestPermissions: true,
                        stale: true,
                    },
                    function (location) {
                        if (location) {
                            last_location = location as GeoLocation;
                        }
                    },
                )
                .then(function (id) {
                    setTimeout(function () {
                        resolve(last_location);
                        self._plugin.removeWatcher({ id });
                    }, timeout);
                })
                .catch(err => {
                    Logger.Error(`Could not define geolocation:`, err);
                    resolve(undefined);
                });
        });
    }
}

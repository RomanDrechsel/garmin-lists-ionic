import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class ConfigService {
    /**
     * build version of the garmin app
     */
    public readonly GarminAppVersion = 3;

    /**
     * app-id for the Garmin ConnectIQ store
     */
    public readonly GarminAppStoreId = "c04a5671-7e39-46e7-b911-1911dbb2fe05";
}

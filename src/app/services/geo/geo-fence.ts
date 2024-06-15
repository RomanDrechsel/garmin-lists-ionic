import { Locale } from "../localization/locale";
import { Logger } from "../logging/logger";
import { GeoLocation } from "./geo-location";

export class GeoFence extends GeoLocation {
    public static readonly DEFAULT_RADIUS: number = 100;

    public Radius: number;

    constructor(lat: number, lng: number, label: string | undefined = undefined, radius: number | undefined = undefined) {
        super(lat, lng, label);
        if (!radius) {
            radius = GeoFence.DEFAULT_RADIUS;
        }
        this.Radius = radius;
    }

    public override equals(other: GeoLocation | undefined): boolean {
        if (!super.equals(other)) {
            return false;
        }
        if (other instanceof GeoFence) {
            return this.Radius === other!.Radius;
        }

        return true;
    }

    public toBackend(): GeoFenceModel {
        return {
            lat: this.Latitude,
            lng: this.Longitude,
            label: this.Label,
            radius: this.Radius,
        };
    }

    public static fromBackend(obj: any): GeoFence | undefined {
        const props = ["lat", "lng"];
        for (let i = 0; i < props.length; i++) {
            if (!obj.hasOwnProperty(props[i])) {
                Logger.Error(`Geofence could not been read from backend, property ${props[i]} not found}`);
                return undefined;
            }
        }

        return new GeoFence(obj.lat, obj.lng, obj.label ?? Locale.getText("service-geo.fence_desc"), obj.radius ?? GeoFence.DEFAULT_RADIUS);
    }
}

export declare type GeoFenceModel = {
    lat: number;
    lng: number;
    label: string;
    radius: number;
};

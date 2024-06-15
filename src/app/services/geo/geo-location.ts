import { Locale } from "../localization/locale";

export class GeoLocation {
    /** Latitude in degrees. */
    public readonly Latitude: number;
    /** Longitude in degrees. */
    public readonly Longitude: number;
    /** address of the location, found by geocoder */
    public Label: string;

    constructor(lat: number, lng: number, label: string | undefined = undefined) {
        this.Latitude = lat;
        this.Longitude = lng;
        this.Label = label ?? Locale.getText("service-geo.fence_desc");
    }

    public equals(other: GeoLocation | undefined): boolean {
        if (!other) {
            return false;
        }
        return this.Latitude === other.Latitude && this.Longitude === other.Longitude && this.Label === other.Label;
    }
}

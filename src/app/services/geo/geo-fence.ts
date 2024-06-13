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
}

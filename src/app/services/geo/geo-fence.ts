export class GeoFence {
    constructor(public Latitude: number, public Longitude: number, public Radius: number, public Description: string) {}

    public equals(other: GeoFence | undefined): boolean {
        if (!other) {
            return false;
        }
        return this.Latitude === other.Latitude && this.Longitude === other.Longitude && this.Radius === other.Radius && this.Description === other.Description;
    }
}

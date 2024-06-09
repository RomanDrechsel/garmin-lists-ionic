import { Position } from "@capacitor/geolocation";

export class GeoLocation {
    /* Latitude in degrees. */
    public readonly Latitude: number;
    /* Longitude in degrees. */
    public readonly Longitude: number;
    /* Radius of horizontal uncertainty in metres, with 68% confidence. */
    public readonly Accuracy: number;
    /* Vertical uncertainty in metres, with 68% confidence (or null). */
    public readonly AltitudeAccuracy: number | null | undefined;
    /* Metres above sea level (or null). */
    public readonly Altitude: number | null;
    /* Speed in metres per second (or null). */
    public readonly Speed: number | null;
    /* Time the location was produced, in milliseconds since the unix epoch. */
    public readonly Timestamp: number;
    /* Heading in degrees clockwise from true north, with 68% confidence (or null). */
    public readonly Heading: number | null;

    constructor(positon: Position) {
        this.Latitude = positon.coords.latitude;
        this.Longitude = positon.coords.longitude;
        this.Accuracy = positon.coords.accuracy;
        this.AltitudeAccuracy = positon.coords.altitudeAccuracy;
        this.Altitude = positon.coords.altitude;
        this.Speed = positon.coords.speed;
        this.Timestamp = positon.timestamp;
        this.Heading = positon.coords.heading;
    }
}

export declare type GeoLocation = {
    // Longitude in degrees.
    longitude: number;
    // Latitude in degrees.
    latitude: number;
    // Radius of horizontal uncertainty in metres, with 68% confidence.
    accuracy: number;
    // Metres above sea level (or null).
    altitude: number;
    // Vertical uncertainty in metres, with 68% confidence (or null).
    altitudeAccuracy: number;
    // Deviation from true north in degrees (or null).
    bearing: number;
    // True if the location was simulated by software, rather than GPS.
    simulated: boolean;
    // Speed in metres per second (or null).
    speed: number;
    // Time the location was produced, in milliseconds since the unix epoch.
    time: number;
};

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, OnInit, Output, inject } from "@angular/core";
import * as L from "leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.js";
import { GeoLocationService } from "../../services/geo/geo-location.service";
import { Logger } from "../../services/logging/logger";

@Component({
    selector: "app-map",
    standalone: true,
    imports: [CommonModule],
    templateUrl: "./map.component.html",
    styleUrl: "./map.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit {
    @Input("location") public _location?: MapLocation;
    @Output("selectedLocation") private _selectedLocation?: MapLocation;
    private _map?: L.Map;

    private readonly GeoService = inject(GeoLocationService);

    public async ngOnInit() {
        if (!this._location) {
            const location = await this.GeoService.GetCurrentLocation();
            if (location) {
                this._location = { lat: location?.latitude, lng: location?.longitude };
            }
        }
        await this.initMap();
    }

    private async initMap() {
        if (this._location) {
            this._map = new L.Map("map").setView([this._location.lat, this._location.lng], 13);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(this._map);

            setTimeout(() => {
                this._map?.invalidateSize();
            }, 0);

            this.setMarker(this._location, "Hier");

            const geocoder = (L.Control as any)({
                defaultMarkGeocode: false,
            })
                .on("markgeocode", (e: any) => {
                    const bbox = e.geocode.bbox;
                    const poly = L.polygon([
                        [bbox.getSouthEast().lat, bbox.getSouthEast().lng],
                        [bbox.getNorthEast().lat, bbox.getNorthEast().lng],
                        [bbox.getNorthWest().lat, bbox.getNorthWest().lng],
                        [bbox.getSouthWest().lat, bbox.getSouthWest().lng],
                    ]);
                    this._map!.fitBounds(poly.getBounds());
                    this._map!.setView(e.geocode.center, 13);
                    L.marker(e.geocode.center).addTo(this._map!).bindPopup(e.geocode.name).openPopup();
                })
                .addTo(this._map);

            this._map.on("click", (e: L.LeafletMouseEvent) => {
                this._selectedLocation = e.latlng;
                Logger.Debug(`Selected location on map: `, this._selectedLocation);
            });
        }
    }

    public setMarker(location: MapLocation, text: string) {
        if (this._map) {
            this._map.setView(location, 20);
            L.marker([location.lat, location.lng], { icon: MapMarker }).addTo(this._map);
            L.marker(location, { icon: MapMarker }).addTo(this._map!).bindPopup(text).openPopup();
        }
    }
}

export declare type MapLocation = {
    lat: number;
    lng: number;
};

const MapMarker = L.icon({
    iconUrl: "./assets/icons/map/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 40],
    popupAnchor: [-3, -76],
    shadowUrl: "./assets/icons/map/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 40],
});

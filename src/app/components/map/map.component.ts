import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, inject } from "@angular/core";
import { IonSearchbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import * as L from "leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.js";
import { GeoAddress } from "../../services/geo/geo-address";
import { GeoFence } from "../../services/geo/geo-fence";
import { GeoLocationService } from "../../services/geo/geo-location.service";
import { LocalizationService } from "../../services/localization/localization.service";
import { Logger } from "../../services/logging/logger";

@Component({
    selector: "app-map",
    standalone: true,
    imports: [IonSearchbar, CommonModule, TranslateModule],
    templateUrl: "./map.component.html",
    styleUrl: "./map.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit {
    private _selectedLocation?: GeoFence;
    private _map?: L.Map;
    private _locationMarker?: L.Marker;

    private readonly Locale = inject(LocalizationService);
    private readonly GeoService = inject(GeoLocationService);

    public async ngOnInit() {
        await this.initMap();
    }

    private async initMap() {
        this._map = new L.Map("map");

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this._map);

        setTimeout(() => {
            this._map?.invalidateSize();
        }, 0);

        this._map.on("click", (e: L.LeafletMouseEvent) => {
            this._selectedLocation = new GeoFence(e.latlng.lat, e.latlng.lng, 100, this.Locale.getText("comp-map.fence_desc"));
            this.setMarker(this._selectedLocation);
            Logger.Debug(`Selected location on map: `, this._selectedLocation);
        });
    }

    public setMarker(addr: GeoAddress | GeoFence) {
        if (this._map) {
            const lat: number = addr instanceof GeoFence ? addr.Latitude : addr.lat;
            const lng: number = addr instanceof GeoFence ? addr.Longitude : addr.lng;
            const title: string = addr instanceof GeoFence ? addr.Description : addr.address;
            this._map.setView([lat, lng], 20);
            if (this._locationMarker) {
                this._map.removeLayer(this._locationMarker);
            }
            this._locationMarker = L.marker([lat, lng], { icon: MapMarker }).addTo(this._map!).bindPopup(title).openPopup();
        }
    }

    public async searchAdress(target: HTMLIonSearchbarElement) {
        const address = await this.GeoService.getCoodinates(target.value);
        if (address && this._map) {
            this.setMarker(address);
        }
    }
}

const MapMarker = L.icon({
    iconUrl: "./assets/icons/map/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 40],
    popupAnchor: [-3, -76],
    shadowUrl: "./assets/icons/map/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 40],
});

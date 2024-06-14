import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from "@angular/core";
import { PluginListenerHandle } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { IonSearchbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import * as L from "leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.js";
import { BehaviorSubject } from "rxjs";
import { GeoFence } from "../../../services/geo/geo-fence";
import { GeoLocation } from "../../../services/geo/geo-location";
import { GeoLocationService } from "../../../services/geo/geo-location.service";
import { LocalizationService } from "../../../services/localization/localization.service";
import { MapMarkerEditor } from "../marker-editor/marker-editor.component";

//TODO: address suggestions

@Component({
    selector: "app-map",
    standalone: true,
    imports: [IonSearchbar, CommonModule, TranslateModule],
    templateUrl: "./map.component.html",
    styleUrl: "./map.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements OnInit, OnDestroy {
    private _selectedLocation?: GeoFence;
    private _map?: L.Map;
    private _locationMarker?: L.Marker;

    private onLocationSelectedSubject = new BehaviorSubject<GeoFence | undefined>(undefined);
    public onLocationSelected$ = this.onLocationSelectedSubject.asObservable();

    private readonly Locale = inject(LocalizationService);
    private readonly GeoService = inject(GeoLocationService);
    private readonly ModalCtrl = inject(ModalController);

    private _keyboardListener?: PluginListenerHandle;

    public async ngOnInit() {
        await this.initMap();

        this._keyboardListener = await Keyboard.addListener("keyboardDidHide", () => {
            setTimeout(() => {
                this._map?.invalidateSize();
            }, 0);
        });
    }

    public async ngOnDestroy() {
        await this._keyboardListener?.remove();
    }

    private async initMap() {
        this._map = new L.Map("map");

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this._map);

        setTimeout(() => {
            this._map?.invalidateSize();
        }, 0);

        let currentpos = this.GeoService.getCurrentLocationSnapshot();
        if (!currentpos) {
            currentpos = await this.GeoService.GetCurrentLocation(2000);
        }
        if (currentpos) {
            this._map.setView([currentpos.Latitude, currentpos.Latitude], 20);
        }

        this._map.on("click", (e: L.LeafletMouseEvent) => {
            const address = this._selectedLocation ? this._selectedLocation.Label : this.Locale.getText("service-geo.fence_desc");
            this._selectedLocation = new GeoFence(e.latlng.lat, e.latlng.lng, address, 100);
            this.setMarker(this._selectedLocation);
            this.onLocationSelectedSubject.next(this._selectedLocation);
        });
    }

    public setMarker(addr: GeoLocation | GeoFence | undefined) {
        if (this._map) {
            if (this._locationMarker) {
                this._map.removeLayer(this._locationMarker);
                this._locationMarker = undefined;
            }
            if (addr) {
                this._map.setView(new L.LatLng(addr.Latitude, addr.Longitude), this._map.getZoom(), { animate: true, duration: 1 });
                this._locationMarker = L.marker([addr.Latitude, addr.Longitude], { icon: MapMarker, riseOffset: -20 }).addTo(this._map!).bindPopup(addr.Label).openPopup();
                this._locationMarker.on("click", async event => {
                    await this.editLabel(addr.Label);
                });
                if (addr instanceof GeoFence) {
                    this._selectedLocation = addr;
                } else {
                    this._selectedLocation = new GeoFence(addr.Latitude, addr.Longitude, addr.Label);
                }
            }
        }
    }

    public async searchAddress(target: HTMLIonSearchbarElement) {
        const address = await this.GeoService.getCoodinates(target.value);
        if (address && this._map) {
            address.Label = this._selectedLocation ? this._selectedLocation.Label : this.Locale.getText("service-geo.fence_desc");
            this.setMarker(new GeoFence(address.Latitude, address.Longitude, address.Label));
        }
    }

    private async editLabel(label: string | undefined) {
        if (label) {
            const newlabel = await MapMarkerEditor(this.ModalCtrl, { label: label });
            if (newlabel && newlabel != label && this._selectedLocation) {
                this._selectedLocation.Label = newlabel;
                this.onLocationSelectedSubject.next(this._selectedLocation);
            }
            this.setMarker(this._selectedLocation);
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

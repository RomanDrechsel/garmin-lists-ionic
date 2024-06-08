import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonHeader, IonInput, IonItem, IonList, IonNote, IonToggle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import * as L from "leaflet";
import { StringUtils } from "../../../classes/utils/stringutils";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { MapComponent, MapLocation } from "../../../components/map/map.component";
import { GeoLocationService } from "../../../services/geo/geo-location.service";
import { List } from "../../../services/lists/list";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-geo-fencing",
    templateUrl: "./geo-fencing.page.html",
    styleUrls: ["./geo-fencing.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonInput, IonList, IonNote, IonItem, IonToggle, IonHeader, IonToolbar, IonContent, MainToolbarComponent, MapComponent, CommonModule, FormsModule, TranslateModule],
})
export class GeoFencingPage extends PageBase {
    private readonly Route = inject(ActivatedRoute);
    private readonly GeoService = inject(GeoLocationService);
    @ViewChild("map", { read: MapComponent }) private _map?: MapComponent;

    public List?: List | null = undefined;

    public get GeoLocation(): MapLocation | undefined {
        if (this.List?.GeoFence) {
            return { lat: this.List.GeoFence.Latitude, lng: this.List.GeoFence.Longitude };
        } else {
            const location = this.GeoService.getCurrentLocationSnapshot();
            if (location) {
                return { lat: location.latitude, lng: location.longitude };
            } else {
                return undefined;
            }
        }
    }

    public get Status(): string {
        if (this.List?.GeoFenceEnabled) {
            return this.Locale.getText("page_geofencing.active");
        } else {
            return this.Locale.getText("page_geofencing.inactive");
        }
    }

    public get StatusNote(): string | undefined {
        if (this.List) {
            if (this.List.GeoFenceEnabled) {
                return this.Locale.getText("page_geofencing.active_note", { title: StringUtils.shorten(this.List.Name, 40) });
            } else {
                return this.Locale.getText("page_geofencing.inactive_note", { title: StringUtils.shorten(this.List.Name, 40) });
            }
        } else {
            return undefined;
        }
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetList(listid);
            this.cdr.detectChanges();
        }
    }

    public async onActiveChanged(checked: boolean) {
        if (this.List) {
            this.List.GeoFenceEnabled = checked;
            this.ListsService.StoreList(this.List);
        }
    }

    public geocodeAddress(address: string) {
        if (!address || !this._map) {
            return;
        }

        const geocoder = (L.Control as any).Geocoder.nominatim();
        geocoder.geocode(address, (results: any) => {
            if (results.length === 0) {
                return;
            }
            const result = results[0];
            this._map?.setMarker(result.center, result.name);
        });
    }
}

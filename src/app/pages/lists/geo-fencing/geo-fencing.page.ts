import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonHeader, IonInput, IonNote, IonSearchbar, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { StringUtils } from "../../../classes/utils/stringutils";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { MapComponent } from "../../../components/map/map/map.component";
import { GeoLocation } from "../../../services/geo/geo-location";
import { GeoLocationService } from "../../../services/geo/geo-location.service";
import { List } from "../../../services/lists/list";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-geo-fencing",
    templateUrl: "./geo-fencing.page.html",
    styleUrls: ["./geo-fencing.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonSearchbar, IonInput, IonNote, IonToggle, IonHeader, IonContent, MainToolbarComponent, MapComponent, CommonModule, FormsModule, TranslateModule],
})
export class GeoFencingPage extends PageBase implements OnInit {
    private readonly Route = inject(ActivatedRoute);
    private readonly GeoService = inject(GeoLocationService);
    @ViewChild("map", { read: MapComponent }) private _map?: MapComponent;

    public List?: List | null = undefined;

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

    public ngOnInit(): void {
        if (this._map) {
            this._map.onLocationSelected$.subscribe();
        }
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetList(listid);
            if (this._map) {
                if (this.List?.GeoFence) {
                    this._map?.setMarker(this.List.GeoFence);
                } else {
                    let location = this.GeoService.getCurrentLocationSnapshot();
                    if (!location) {
                        location = await this.GeoService.GetCurrentLocation();
                    }
                    if (location) {
                        this._map?.setMarker(new GeoLocation(location.Latitude, location.Longitude, this.Locale.getText("service-geo.currentLocation")));
                    }
                }
            }
            this.cdr.detectChanges();
        }
    }

    public async onActiveChanged(checked: boolean) {
        if (this.List) {
            this.List.GeoFenceEnabled = checked;
            this.ListsService.StoreList(this.List);
        }
    }
}

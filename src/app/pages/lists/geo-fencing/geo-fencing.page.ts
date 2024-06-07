import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonHeader, IonItem, IonNote, IonToggle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { List } from "../../../services/lists/list";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-geo-fencing",
    templateUrl: "./geo-fencing.page.html",
    styleUrls: ["./geo-fencing.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonNote, IonItem, IonToggle, IonHeader, IonToolbar, IonContent, MainToolbarComponent, CommonModule, FormsModule, TranslateModule],
})
export class GeoFencingPage extends PageBase {
    private readonly Route = inject(ActivatedRoute);

    public List?: List | null = undefined;

    public get Status(): string {
        return this.Locale.getText("page_geofencing.inactive");
    }

    public get StatusNote(): string {
        return this.Locale.getText("page_geofencing.inactive_note");
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetList(listid);
        }
    }
}

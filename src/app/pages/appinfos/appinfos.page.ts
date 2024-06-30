import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Browser } from "@capacitor/browser";
import { IonButton, IonCol, IonContent, IonGrid, IonImg, IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonRow, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { AppService } from "../../services/app/app.service";
import { GeoLocationService } from "../../services/geo/geo-location.service";
import { PageBase } from "../page-base";

@Component({
    selector: "app-appinfos",
    templateUrl: "./appinfos.page.html",
    styleUrls: ["./appinfos.page.scss"],
    standalone: true,
    imports: [IonImg, IonButton, IonNote, MainToolbarComponent, CommonModule, FormsModule, TranslateModule, IonContent, IonList, IonItem, IonLabel, IonText, IonGrid, IonRow, IonCol, IonItemDivider, IonContent, IonList, IonItem, IonLabel, IonText, IonGrid, IonRow, IonCol],
})
export class AppinfosPage extends PageBase {
    public BundleId: string = "";
    public Appversion: string = "";
    public Build: string = "";
    public Platform: string = "";
    public DatabaseSize: { lists: string; trash: string } = { lists: "-", trash: "-" };
    public LogsSize: string = "-";

    private readonly GeoLocation = inject(GeoLocationService);

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();

        this.BundleId = AppService.AppInfo.PackageName;
        this.Appversion = AppService.AppInfo.VersionString;
        this.Build = String(AppService.AppInfo.Build);
        this.Platform = AppService.AppPlatformString;

        this.Logger.Important(`TODO: Database size`);
        /*const size = await this.Database.getDatabaseSize();
        if (size) {
            this.DatabaseSize = FileUtils.File.FormatSize(size);
        }*/
    }

    public get isDarkmode(): boolean {
        return AppService.Darkmode;
    }

    public async bmc() {
        await Browser.open({ url: "https://buymeacoffee.com/romandrechsel" });
    }
}

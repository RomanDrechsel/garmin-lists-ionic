import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonButton, IonCol, IonContent, IonGrid, IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonRow, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { AppService } from "../../services/app/app.service";
import { PageBase } from "../page-base";

@Component({
    selector: "app-appinfos",
    templateUrl: "./appinfos.page.html",
    styleUrls: ["./appinfos.page.scss"],
    standalone: true,
    imports: [IonButton,
        IonNote,
        MainToolbarComponent,
        CommonModule,
        FormsModule,
        TranslateModule,
        IonContent,
        IonList,
        IonItem,
        IonLabel,
        IonText,
        IonGrid,
        IonRow,
        IonCol,
        IonItemDivider,
        IonContent,
        IonList,
        IonItem,
        IonLabel,
        IonText,
        IonGrid,
        IonRow,
        IonCol
    ],
})
export class AppinfosPage extends PageBase {
    public BundleId: string = "";
    public Appversion: string = "";
    public Build: string = "";
    public Platform: string = "";

    constructor() {
        super();
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();

        this.BundleId = AppService.AppInfo.PackageName;
        this.Appversion = AppService.AppInfo.VersionString;
        this.Build = String(AppService.AppInfo.Build);
        this.Platform = AppService.AppPlatformString;
    }
}

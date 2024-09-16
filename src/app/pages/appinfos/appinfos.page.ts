import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { InAppReview } from "@capacitor-community/in-app-review";
import { Browser } from "@capacitor/browser";
import { Device } from "@capacitor/device";
import { IonButton, IonCol, IonContent, IonGrid, IonImg, IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonRow, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription, interval } from "rxjs";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { FileUtils } from "../../classes/utils/file-utils";
import { PageBase } from "../page-base";
import { AppService } from './../../services/app/app.service';

@Component({
    selector: "app-appinfos",
    templateUrl: "./appinfos.page.html",
    styleUrls: ["./appinfos.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonImg, IonButton, IonNote, MainToolbarComponent, CommonModule, FormsModule, TranslateModule, IonContent, IonList, IonItem, IonLabel, IonText, IonGrid, IonRow, IonCol, IonItemDivider, IonContent, IonList, IonItem, IonLabel, IonText, IonGrid, IonRow, IonCol],
})
export class AppinfosPage extends PageBase {
    public BundleId: string = "";
    public Appversion: string = "";
    public Build: string = "";
    public Platform: string = "";
    public DatabaseSizeLists: string = "-";
    public DatabaseSizeTrash: string = "-";
    public MemoryUsage: string = "-";
    public LogsSize: string = "-";
    public WebsiteLink = "roman-drechsel.de";
    private timerSubscription?: Subscription;

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();

        const meta = await this.AppService.AppMetaInfo();
        this.BundleId = meta.Package?.Name ?? "-";
        this.Appversion = meta.Package?.VersionString ?? "-";
        this.Build = String(meta.Package?.Build ?? "");
        this.Platform = AppService.AppPlatformString;

        this.timerSubscription = interval(5000).subscribe(async () => {
            await this.requestStatistics();
        });
        await this.requestStatistics();
    }

    public override async ionViewWillLeave() {
        super.ionViewWillLeave();
        this.timerSubscription?.unsubscribe();
    }

    public get isDarkmode(): boolean {
        return AppService.Darkmode;
    }

    public async bmc() {
        await Browser.open({ url: "https://buymeacoffee.com/romandrechsel" });
    }

    public async mywebsite() {
        await Browser.open({ url: `https://${this.WebsiteLink}` });
    }

    public async writeReviewIQ() {
        await this.ConnectIQ.openStore();
    }

    public async writeReviewGoogle() {
        await InAppReview.requestReview();
    }

    private async requestStatistics() {
        this.LogsSize = FileUtils.File.FormatSize((await this.Logger.GetLogSize()).size);
        const database = await this.ListsService.BackendSize();
        this.DatabaseSizeLists = FileUtils.File.FormatSize(database.lists.size);
        this.DatabaseSizeTrash = FileUtils.File.FormatSize(database.trash.size);

        const deviceinfo = await Device.getInfo();
        if (deviceinfo.memUsed) {
            this.MemoryUsage = FileUtils.File.FormatSize(deviceinfo.memUsed);
        }
        this.cdr.detectChanges();
    }
}

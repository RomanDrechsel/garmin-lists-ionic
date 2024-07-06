import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Capacitor } from "@capacitor/core";
import { FileInfo } from "@capacitor/filesystem";
import { SelectCustomEvent } from "@ionic/angular";
import { IonContent, IonFab, IonFabButton, IonFabList, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTextarea, ModalController, NavController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription, interval } from "rxjs";
import { FileUtils } from "src/app/classes/utils/fileutils";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { AppMetaData } from "../../../classes/app-meta-data";
import { StoreFile } from "../../../components/store-file/store-file.component";
import { AppService } from "../../../services/app/app.service";
import { PageBase } from "../../page-base";
@Component({
    selector: "app-showlogs",
    templateUrl: "./showlogs.page.html",
    styleUrls: ["./showlogs.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, TranslateModule, MainToolbarComponent, IonIcon, IonLabel, IonFabButton, IonFab, IonFabList, IonContent, IonList, IonItem, IonSelect, IonTextarea, IonSelectOption],
})
export class ShowlogsPage extends PageBase {
    @ViewChild('selectLogfiles') private selectLogfiles?: IonSelect;
    public currentLogfile?: FileUtils.File;
    public availableLogfiles: FileInfo[] = [];
    public totalLogfiles: number = 0;
    private timerSubscription?: Subscription;

    private readonly ModaleCtrl = inject(ModalController);
    private readonly AppService = inject(AppService);
    private readonly NavController = inject(NavController);

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this.loadLogfile();
    }

    public override async ionViewDidEnter() {
        await super.ionViewDidEnter();
        this.timerSubscription = interval(5000).subscribe(async () => {
            this.currentLogfile = await this.Logger.GetLogfile(this.currentLogfile?.Filename);
        });
    }

    public override async ionViewWillLeave() {
        await super.ionViewWillLeave();
        this.timerSubscription?.unsubscribe();
    }

    public onChangeLogfile(event: SelectCustomEvent) {
        this.loadLogfile(event.detail.value);
    }

    public async onDelete() {
        if (this.currentLogfile) {
            const locale = this.Locale.getText(["yes", "no", "page_settings_showlogs.confirm_delete"], { filename: this.currentLogfile.Filename });
            await this.Popups.Alert.YesNo({
                message: locale["page_settings_showlogs.confirm_delete"],
                button_no: locale["no"],
                button_yes: {
                    text: locale["yes"],
                    handler: async () => {
                        await FileUtils.DeleteFile(this.currentLogfile!.Path);
                        this.Popups.Toast.Success("page_settings_showlogs.toast_deleted");
                        this.NavController.navigateBack("settings/logging");
                    },
                },
            });
        }
    }

    public async onSave() {
        if (this.currentLogfile) {
            this.Logger.Important("Device Info: \n", await AppMetaData(this.AppService));
            const text_key = Capacitor.isNativePlatform() ? "page_settings_showlogs.store_text" : "page_settings_showlogs.store_text_web";
            const locale = this.Locale.getText(["page_settings_showlogs.store_title", text_key, "save"]);
            await StoreFile(this.ModaleCtrl, {
                title: locale["page_settings_showlogs.store_title"],
                text: (locale[text_key] as string).replace("{{filename}}", this.currentLogfile.Filename),
                button: locale["save"],
                file: this.currentLogfile,
            });
        }
    }

    public formatLogfile(file?: FileInfo | null): string {
        if (file) {
            return `${file.name} (${FileUtils.File.FormatSize(file.size)})`;
        } else {
            return "";
        }
    }

    public openCalendar() {

    }

    private async loadLogfile(file: FileInfo | undefined = undefined) {
        const logs = await this.Logger.ListLogfiles(20);
        this.availableLogfiles = logs.files;
        this.totalLogfiles = logs.totalcount;
        this.currentLogfile = await this.Logger.GetLogfile(file?.name);

        if (this.currentLogfile.Exists == false && this.availableLogfiles.length > 0) {
            this.currentLogfile = await this.Logger.GetLogfile(this.availableLogfiles[0].name);
        }
        if (this.currentLogfile && this.selectLogfiles) {
            this.selectLogfiles.label = this.currentLogfile?.Filename;
        }

        this.cdr.detectChanges();
    }
}

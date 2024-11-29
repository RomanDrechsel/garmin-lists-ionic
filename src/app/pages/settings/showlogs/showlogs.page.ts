import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FileInfo } from "@capacitor/filesystem";
import { IonContent, IonFab, IonFabButton, IonFabList, IonIcon, IonSelect, IonSelectOption, IonText, ModalController, SelectCustomEvent } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription, interval } from "rxjs";
import { FileUtils } from "src/app/classes/utils/file-utils";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { SelectDatetime } from "../../../components/datetime/datetime.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { ShareLogfile } from "../../../components/share-log/share-log.component";
import { PageBase } from "../../page-base";
@Component({
    selector: "app-showlogs",
    templateUrl: "./showlogs.page.html",
    styleUrls: ["./showlogs.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PageEmptyComponent, CommonModule, FormsModule, TranslateModule, MainToolbarComponent, IonIcon, IonFabButton, IonFab, IonFabList, IonContent, IonSelect, IonSelectOption, IonText],
})
export class ShowlogsPage extends PageBase {
    public currentLogfile?: FileUtils.File;
    public availableLogfiles: FileInfo[] = [];
    private timerSubscription?: Subscription;

    private selectedDate?: Date;

    private readonly ModaleCtrl = inject(ModalController);

    public get SelectedDayString(): string | undefined {
        return this.selectedDate?.toLocaleDateString(this.Locale.CurrentLanguage.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    public get LogfilesAvailable(): boolean {
        return this.availableLogfiles.length > 0;
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        await this.selectLogDay(undefined);
    }

    public override async ionViewDidEnter() {
        await super.ionViewDidEnter();
        this.timerSubscription = interval(5000).subscribe(async () => {
            if (this.currentLogfile) {
                this.currentLogfile = await this.Logger.GetLogfile(this.currentLogfile?.Filename);
            }
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
            await ShareLogfile(this.ModaleCtrl, { file: this.currentLogfile });
        }
    }

    public formatLogfile(file?: FileInfo | null): string {
        if (file) {
            return `${file.name} (${FileUtils.File.FormatSize(file.size)})`;
        } else {
            return "";
        }
    }

    public async openCalendar() {
        let minimumDate: Date | undefined = undefined;
        if (this.Logger.AutoDelete > 0) {
            minimumDate = new Date();
            minimumDate.setDate(minimumDate.getDate() - this.Logger.AutoDelete);
        }

        const date = await SelectDatetime(this.ModaleCtrl, { selectedDate: this.selectedDate, maximumDate: new Date(), minimumDate: minimumDate, title: this.Locale.getText("page_settings_showlogs.select_logday_title") });
        if (date) {
            this.selectLogDay(date);
        }
    }

    private async selectLogDay(date: Date | undefined) {
        if (!date) {
            date = new Date();
        }

        this.selectedDate = date;
        this.availableLogfiles = await this.Logger.ListLogfiles(new Date(date).setHours(0, 0, 0, 0), new Date(date).setHours(23, 59, 59, 999));
        if (this.availableLogfiles.length > 0) {
            this.loadLogfile(this.availableLogfiles[0].name);
        } else {
            this.loadLogfile(undefined);
        }
    }

    private async loadLogfile(filename: string | undefined) {
        if (filename) {
            this.currentLogfile = await this.Logger.GetLogfile(filename);
        } else {
            this.currentLogfile = undefined;
        }

        this.cdr.detectChanges();
    }
}

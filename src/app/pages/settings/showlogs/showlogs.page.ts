import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { FileInfo } from "@capacitor/filesystem";
import { IonContent, IonFab, IonFabButton, IonFabList, IonIcon, IonSelect, IonSelectOption, IonText, ModalController, SelectCustomEvent } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { interval, Subscription } from "rxjs";
import { FileUtils } from "src/app/classes/utils/file-utils";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { InteractionAnimation } from "../../../animations/interaction-animation";
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
    @ViewChild("fabButton", { read: ElementRef, static: false }) fabButton?: ElementRef;

    @ViewChild("saveLogsButton", { read: ElementRef, static: false }) saveLogsButton?: ElementRef;

    public currentLogfile?: FileUtils.File;

    public availableLogfiles: FileInfo[] = [];

    public runningAnimation?: InteractionAnimation;

    private _timerSubscription?: Subscription;

    private _selectedDate?: Date;

    private readonly ModaleCtrl = inject(ModalController);
    private readonly Route = inject(ActivatedRoute);

    public get SelectedDayString(): string | undefined {
        return this._selectedDate?.toLocaleDateString(this.Locale.CurrentLanguage.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
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
        this._timerSubscription = interval(5000).subscribe(async () => {
            if (this.currentLogfile) {
                this.currentLogfile = await this.Logger.GetLogfile(this.currentLogfile?.Filename);
            }
        });
        const send_errorReport = this.Route.snapshot.queryParams["errorReport"];
        if (send_errorReport) {
            this.runningAnimation = new InteractionAnimation();
            this.runningAnimation.AddStep({
                duration: 1000,
                do: async () => {
                    this.fabButton?.nativeElement.click();
                    return true;
                },
            });
            this.runningAnimation.AddStep({
                duration: 1000,
                do: async () => {
                    this.saveLogsButton?.nativeElement.classList.add("clicked");
                    await new Promise(resolve => setTimeout(resolve, 600));
                    this.saveLogsButton?.nativeElement.classList.remove("clicked");
                    await new Promise(resolve => setTimeout(resolve, 300));
                    this.saveLogsButton?.nativeElement.click();
                    return true;
                },
            });

            this.runningAnimation.Run();
        }
    }

    public override async ionViewWillLeave() {
        await super.ionViewWillLeave();
        this._timerSubscription?.unsubscribe();
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
            await ShareLogfile(this.ModaleCtrl, { file: this.currentLogfile, watch_logs_included: this.runningAnimation?.isRunning, do: this.runningAnimation?.isRunning ? "email" : undefined });
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

        const date = await SelectDatetime(this.ModaleCtrl, { selectedDate: this._selectedDate, maximumDate: new Date(), minimumDate: minimumDate, title: this.Locale.getText("page_settings_showlogs.select_logday_title") });
        if (date) {
            this.selectLogDay(date);
        }
    }

    private async selectLogDay(date: Date | undefined) {
        if (!date) {
            date = new Date();
        }

        this._selectedDate = date;
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

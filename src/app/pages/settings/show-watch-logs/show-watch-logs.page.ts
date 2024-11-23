import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, SelectCustomEvent } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { ConnectIQDevice } from "../../../services/connectiq/connect-iq-device";
import { WatchLoggingService } from "../../../services/logging/watch-logging.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-show-watch-logs",
    templateUrl: "./show-watch-logs.page.html",
    styleUrls: ["./show-watch-logs.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonFabButton, IonFab, IonText, IonIcon, IonContent, IonHeader, IonTitle, IonToolbar, IonSelect, IonSelectOption, CommonModule, FormsModule, TranslateModule, MainToolbarComponent, PageEmptyComponent]
})
export class ShowWatchLogsPage extends PageBase {
    public Device?: ConnectIQDevice = undefined;
    public DeviceLog?: string;

    public availableDevices: ConnectIQDevice[] = [];

    private readonly WatchLogs = inject(WatchLoggingService);

    private _deviceListener?: Subscription;

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._deviceListener = this.ConnectIQ.onDeviceChanged$.subscribe(async () => {
            await this.loadDevices();
        });
    }

    public override async ionViewWillLeave() {
        await super.ionViewWillLeave();
        this._deviceListener?.unsubscribe();
        this._deviceListener = undefined;
    }

    public async loadLog() {
        if (this.Device) {
            const logs = await this.WatchLogs.RequestGarminWatchLogs(this.Device.Identifier);
            if (logs) {
                this.DeviceLog = logs.join("\n");
                this.cdr.detectChanges();
                return;
            }
        }
        this.DeviceLog = undefined;
        this.cdr.detectChanges();
    }

    public async onChangeDevice(event: SelectCustomEvent) {
        if (!this.Device?.equals(event.detail.value)) {
            await this.loadLog();
        }
    }

    private async loadDevices() {
        this.availableDevices = (await this.ConnectIQ.getDevices()).filter(d => d.State == "Ready");
        if (this.Device) {
            if (this.availableDevices.filter(d => d.Identifier === this.Device!.Identifier).length == 0) {
                this.Device = undefined;
                this.DeviceLog = undefined;
            }
        } else {
            if (this.availableDevices.length > 0) {
                this.Device = this.availableDevices[0];
            }
        }
        if (this.Device && !this.DeviceLog) {
            await this.loadLog();
        }
        this.cdr.detectChanges();
    }
}

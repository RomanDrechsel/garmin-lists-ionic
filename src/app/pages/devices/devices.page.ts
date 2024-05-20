import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonButton, IonCard, IonCol, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonLabel, IonRow, IonSelect, IonSelectOption, IonText, IonTitle, IonToggle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { ConnectIQDevice } from "src/app/services/connectiq/connect-iq-device";
import { PageBase } from "../page-base";

@Component({
    selector: "app-devices",
    templateUrl: "./devices.page.html",
    styleUrls: ["./devices.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonToggle, IonLabel, IonFabButton, IonIcon, IonFab, IonCol, IonRow, IonText, IonButton, IonCard, IonContent, IonHeader, IonTitle, IonToolbar, IonSelect, IonSelectOption, CommonModule, FormsModule, MainToolbarComponent, TranslateModule],
})
export class DevicesPage extends PageBase {
    @ViewChild("deviceSelect") private deviceSelect!: IonSelect;

    public SelectedDevice?: ConnectIQDevice;
    public ListUuid?: string;
    public Devices: ConnectIQDevice[] = [];

    private initListener?: Subscription;
    private stateListener?: Subscription;

    private Route = inject(ActivatedRoute);

    public get installHint(): boolean {
        return this.SelectedDevice?.State == "AppNotInstalled";
    }

    public get AlwaysTransmitDeviceSelected(): boolean {
        return this.ConnectIQ.AlwaysTransmitToDevice != undefined && this.ConnectIQ.AlwaysTransmitToDevice.Identifier == this.SelectedDevice?.Identifier;
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this.loadDevices();
        this.ListUuid = this.Route.snapshot.queryParams["transmit"];
    }

    public override async ionViewDidEnter() {
        super.ionViewDidEnter();
        this.initListener = this.ConnectIQ.onInitialized$.subscribe(async () => {
            await this.loadDevices();
        });

        this.stateListener = this.ConnectIQ.onDeviceChanged$.subscribe(device => {
            if (device) {
                if (device?.Identifier == this.SelectedDevice?.Identifier) {
                    this.SelectedDevice = device;
                }
                for (let i = 0; i < this.Devices.length; i++) {
                    if (this.Devices[i].Identifier == device.Identifier) {
                        this.Devices[i] = device;
                    }
                }
            }
            this.cdr.detectChanges();
        });
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.initListener?.unsubscribe();
        this.stateListener?.unsubscribe();
    }

    public async loadDevices() {
        this.Devices = await this.ConnectIQ.getDevices(true);
        if (this.SelectedDevice) {
            this.SelectedDevice = this.Devices.find(d => d.Identifier == this.SelectedDevice?.Identifier);
        }
        this.selectDevice();
    }

    public openStore() {
        this.ConnectIQ.openStore();
    }

    public TransmitList() {
        if (this.ListUuid && this.SelectedDevice) {
            this.ConnectIQ.TransmitList(this.ListUuid, this.SelectedDevice, true);
        }
    }

    public onDeviceChanged(id: number) {
        this.SelectedDevice = this.Devices.find(d => d.Identifier == id);
        this.cdr.detectChanges();
    }

    public onToggle(is_on: boolean) {
        if (this.SelectedDevice) {
            if (is_on) {
                this.ConnectIQ.AlwaysTransmitToDevice = this.SelectedDevice;
            } else {
                this.ConnectIQ.AlwaysTransmitToDevice = undefined;
            }
        }
    }

    private selectDevice() {
        if (!this.SelectedDevice) {
            if (this.ConnectIQ.AlwaysTransmitToDevice) {
                this.SelectedDevice = this.ConnectIQ.AlwaysTransmitToDevice;
            }
            if (!this.SelectedDevice && this.Devices.length > 0) {
                this.Devices.forEach(d => {
                    if (!this.SelectedDevice && d.State == "Ready") {
                        this.SelectedDevice = d;
                    }
                });
                if (!this.SelectedDevice) {
                    this.SelectedDevice = this.Devices[0];
                }
            }
        }

        this.deviceSelect.writeValue(this.SelectedDevice?.Identifier);
        this.cdr.detectChanges();
    }
}

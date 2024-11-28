import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, inject } from "@angular/core";
import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { ConnectIQDevice } from "../../services/connectiq/connect-iq-device";
import { ConnectIQService } from "../../services/connectiq/connect-iq.service";

@Component({
    selector: "app-request-watch-log",
    imports: [IonButton, IonButtons, IonTitle, IonToolbar, IonIcon, IonHeader, CommonModule, TranslateModule],
    templateUrl: "./request-watch-log.component.html",
    styleUrl: "./request-watch-log.component.scss",
})
export class RequestWatchLogComponent implements AfterViewInit {
    public Params!: RequestWatchLogsParams;
    private readonly modalCtrl = inject(ModalController);
    private readonly ConnectIQ = inject(ConnectIQService);

    private _transactionId?: number = undefined;

    public async ngAfterViewInit(): Promise<void> {
        const logs = await this.requestLog(this.Params.device);
        if (logs) {
            this.modalCtrl.dismiss(logs, "confirm");
        } else {
            this.modalCtrl.dismiss(undefined, "cancel");
        }
    }

    public cancel() {
        this.modalCtrl.dismiss(undefined, "cancel");
    }

    public proceedWithoutLogs() {
        if (this._transactionId) {
            this.ConnectIQ.CancelRequest(this._transactionId);
            this._transactionId = undefined;
        }
        this.modalCtrl.dismiss(["Log request canceled"], "confirm");
    }

    private async requestLog(device: ConnectIQDevice): Promise<string[]> {
        return new Promise<string[]>(async resolve => {
            const tid = await this.ConnectIQ.SendToDevice({
                device: device,
                data: { type: "request", request: "logs" },
                response: async message => {
                    if (message) {
                        if (message.Message?.logs) {
                            if (message.Message.logs instanceof Array) {
                                resolve(message.Message.logs as string[]);
                                return;
                            }
                        }
                        resolve(["Invalid device response", message?.Message]);
                        return;
                    }
                    resolve(["Device not responding"]);
                },
                timeout: 300,
            });
            if (typeof tid == "number") {
                this._transactionId = tid;
            } else if (tid === false) {
                resolve(["Request to device failed"]);
            }
            this.ConnectIQ.openApp(device);
        });
    }
}

export const RequestWatchLogs = async function (modalController: ModalController, params: RequestWatchLogsParams): Promise<string[]> {
    const modal = await modalController.create({
        component: RequestWatchLogComponent,
        componentProps: { Params: params },
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: "autosize-modal",
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm") {
        if (data) {
            return data as string[];
        }
    }
    return ["Log request canceled"];
};

declare type RequestWatchLogsParams = {
    device: ConnectIQDevice;
};

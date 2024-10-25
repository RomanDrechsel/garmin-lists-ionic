import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonHeader, IonItem, IonList, IonNote, IonTitle, IonToggle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-lists-transmission",
    templateUrl: "./lists-transmission.page.html",
    styleUrls: ["./lists-transmission.page.scss"],
    standalone: true,
    imports: [IonNote, IonItem, IonToggle, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, MainToolbarComponent],
})
export class ListsTransmissionPage extends PageBase {
    private _openAppOnTransfer: boolean = false;
    private _deleteListOnDevice: boolean = false;

    public get OpenAppOnTransmit(): boolean {
        return this._openAppOnTransfer;
    }

    public set OpenAppOnTransmit(v: boolean) {
        this._openAppOnTransfer = v;
        this.Preferences.Set(EPrefProperty.OpenAppOnTransmit, v);
    }

    public get DeleteListOnDevice(): boolean {
        return this._deleteListOnDevice;
    }

    public set DeleteListOnDevice(v: boolean) {
        this._deleteListOnDevice = v;
        this.Preferences.Set(EPrefProperty.DeleteListOnDevice, v);
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._openAppOnTransfer = await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, false);
        this._deleteListOnDevice = await this.Preferences.Get<boolean>(EPrefProperty.DeleteListOnDevice, false);
        this.cdr.detectChanges();
    }

    public async onOpenAppOnTransmitChanged(checked: boolean) {
        this.OpenAppOnTransmit = checked;
    }

    public onDeleteListOnDeviceChanged(checked: boolean) {
        this.DeleteListOnDevice = checked;
    }
}

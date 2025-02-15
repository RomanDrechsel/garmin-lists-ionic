import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonItem, IonList, IonNote, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-lists-transmission",
    templateUrl: "./lists-transmission.page.html",
    styleUrls: ["./lists-transmission.page.scss"],
    imports: [IonNote, IonItem, IonToggle, IonList, IonContent, CommonModule, FormsModule, TranslateModule, MainToolbarComponent],
})
export class ListsTransmissionPage extends PageBase {
    private _openAppOnTransfer: boolean = false;
    private _deleteListOnDevice: boolean = false;
    private _syncListOnDevice: boolean = false;
    private _undoItemsOnDevice: boolean = false;

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

    public get SyncListOnDevice(): boolean {
        return this._syncListOnDevice;
    }

    public set UndoItemsOnDevice(v: boolean) {
        this._undoItemsOnDevice = v;
        this.Preferences.Set(EPrefProperty.UndoItemsOnDevice, v);
    }

    public get UndoItemsOnDevice(): boolean {
        return this._undoItemsOnDevice;
    }

    public set SyncListOnDevice(v: boolean) {
        this._syncListOnDevice = v;
        this.Preferences.Set(EPrefProperty.SyncListOnDevice, v);
        if (!v) {
            this.confirmRemoveSync();
        }
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._openAppOnTransfer = await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, false);
        this._deleteListOnDevice = await this.Preferences.Get<boolean>(EPrefProperty.DeleteListOnDevice, false);
        this._syncListOnDevice = await this.Preferences.Get<boolean>(EPrefProperty.SyncListOnDevice, false);
        this._undoItemsOnDevice = await this.Preferences.Get<boolean>(EPrefProperty.UndoItemsOnDevice, false);
        this.cdr.detectChanges();
    }

    public onOpenAppOnTransmitChanged(checked: boolean) {
        this.OpenAppOnTransmit = checked;
    }

    public onDeleteListOnDeviceChanged(checked: boolean) {
        this.DeleteListOnDevice = checked;
    }

    public onSyncListOnDeviceChanged(checked: boolean) {
        this.SyncListOnDevice = checked;
    }

    public onUndoItemsOnDeviceChanged(checked: boolean) {
        this.UndoItemsOnDevice = checked;
    }

    private async confirmRemoveSync() {
        if (await this.Popups.Alert.YesNo({ message: "page_lists_transmission.synclist_disable", header: "page_lists_transmission.synclist_disable_title", translate: true })) {
            await this.ListsService.PurgeAllSyncs();
        }
    }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, ViewChild } from "@angular/core";
import { FileOpener } from "@capacitor-community/file-opener";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { FileUtils } from "../../classes/utils/file-utils";
import { ShareUtil } from "../../classes/utils/share-utils";
import { AppService } from "../../services/app/app.service";
import { Logger } from "../../services/logging/logger";
import { PopupsService } from "../../services/popups/popups.service";

@Component({
    selector: "app-share-file",
    standalone: true,
    imports: [IonContent, IonText, IonInput, IonButtons, IonButton, IonTitle, IonIcon, IonToolbar, IonHeader, IonSelect, IonSelectOption, CommonModule, TranslateModule],
    templateUrl: "./share-file.component.html",
    styleUrl: "./share-file.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreFileComponent {
    @ViewChild('do', { read: IonSelect }) do?: IonSelect;
    public Params!: ShareParams;

    private readonly Popups = inject(PopupsService);
    private readonly modalCtrl = inject(ModalController);

    public get IsWebApp(): boolean {
        return AppService.isWebApp;
    }

    public cancel() {
        this.modalCtrl.dismiss(null, "cancel");
    }

    public async storeFile() {
        if (this.Params.file && this.Params.file.Exists) {
            if (this.do) {
                if (this.do.value == 'store') {
                    try {
                        AppService.AppToolbar?.ToggleProgressbar(true);
                        const result = await Filesystem.copy({ from: this.Params.file.Path, to: this.Params.filename ?? this.Params.file.Filename, toDirectory: Directory.Documents });
                        AppService.AppToolbar?.ToggleProgressbar(false);
                        Logger.Debug(`Stored log ${this.Params.file.Filename} in DOCUMENTS`);

                        await FileOpener.open({ filePath: result.uri, contentType: this.Params?.mime });
                        this.Popups.Toast.Success("page_settings_showlogs.store_success");
                        this.modalCtrl.dismiss(null, "confirm");
                    }
                    catch (error) {
                        Logger.Error(`Could not store log ${this.Params.file.Filename} in DOCUMENTS: `, error);
                        this.modalCtrl.dismiss(null, "cancel");
                        this.Popups.Toast.Error("page_settings_showlogs.store_error");
                    }
                }
                else if (this.do.value == 'share') {
                    try {
                        if (await ShareUtil.Share({ files: this.Params.file.Path })) {
                            Logger.Debug(`Shared log ${this.Params.file.Filename}`);
                            this.modalCtrl.dismiss(null, "confirm");
                        }
                        else {
                            Logger.Error(`Could not share log ${this.Params.file.Filename}`);
                            this.modalCtrl.dismiss(null, "cancel");
                            this.Popups.Toast.Error("page_settings_showlogs.store_error");
                        }
                    }
                    catch (error) {
                        Logger.Error(`Could not share log ${this.Params.file.Filename}: `, error);
                        this.modalCtrl.dismiss(null, "cancel");
                        this.Popups.Toast.Error("page_settings_showlogs.store_error");
                    }
                }
                else if (this.do.value == "email") {
                    if (await ShareUtil.SendMail({ sendto: AppService.EMailAddress, files: this.Params.file.Path, title: this.Params.email_title, text: this.Params.email_text })) {
                        Logger.Debug(`Shared log ${this.Params.file.Filename} via e-mail`);
                        this.modalCtrl.dismiss(null, "confirm");
                    }
                    else {
                        Logger.Error(`Could not share log ${this.Params.file.Filename} via e-mail`);
                        this.modalCtrl.dismiss(null, "cancel");
                        this.Popups.Toast.Error("page_settings_showlogs.store_error");
                    }
                }
            }
        }
    }
}

export const ShareFile = async function(modalController: ModalController, params: ShareParams): Promise<boolean> {
    const modal = await modalController.create({
        component: StoreFileComponent,
        componentProps: { Params: params },
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: "autosize-modal",
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm") {
        return true;
    }
    return false;
};

declare type ShareParams = {
    email_title?: string,
    email_text?: string,
    button: string,
    file: FileUtils.File,
    filename?: string,
    mime?: string,
};

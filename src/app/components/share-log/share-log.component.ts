import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, ViewChild } from "@angular/core";
import { FileOpener } from "@capacitor-community/file-opener";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { FileUtils } from "../../classes/utils/file-utils";
import { ShareUtil } from "../../classes/utils/share-utils";
import { LocalizationService } from "../../services/localization/localization.service";
import { Logger } from "../../services/logging/logger";
import { PopupsService } from "../../services/popups/popups.service";
import { AppService } from './../../services/app/app.service';

@Component({
    selector: "app-share-log",
    standalone: true,
    imports: [IonContent, IonText, IonInput, IonButtons, IonButton, IonTitle, IonIcon, IonToolbar, IonHeader, IonSelect, IonSelectOption, CommonModule, TranslateModule],
    templateUrl: "./share-log.component.html",
    styleUrl: "./share-log.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreLogComponent {
    @ViewChild('do', { read: IonSelect }) do?: IonSelect;
    public Params!: ShareLogParams;

    private readonly Locale = inject(LocalizationService);
    private readonly Popups = inject(PopupsService);
    private readonly modalCtrl = inject(ModalController);
    private readonly AppService = inject(AppService);

    public get IsWebApp(): boolean {
        return AppService.isWebApp;
    }

    public cancel() {
        this.modalCtrl.dismiss(null, "cancel");
    }

    public async storeFile() {
        if (this.Params.file && this.Params.file.Exists) {
            if (this.do) {
                const meta = await this.AppService.AppMetaInfo();
                //TODO: Meta an Log anhängen, nach Vorgaben des Benutzers

                if (this.do.value == 'store') {
                    try {
                        AppService.AppToolbar?.ToggleProgressbar(true);
                        const result = await Filesystem.copy({ from: this.Params.file.Path, to: `${this.Params.file.Filename}.txt`, toDirectory: Directory.Documents });
                        AppService.AppToolbar?.ToggleProgressbar(false);
                        Logger.Debug(`Stored log ${this.Params.file.Filename} in DOCUMENTS`);

                        await FileOpener.open({ filePath: result.uri, contentType: 'text/plain' });
                        this.Popups.Toast.Success("comp_sharelog.store_success");
                        this.modalCtrl.dismiss(null, "confirm");
                    }
                    catch (error) {
                        Logger.Error(`Could not store log ${this.Params.file.Filename} in DOCUMENTS: `, error);
                        this.modalCtrl.dismiss(null, "cancel");
                        this.Popups.Toast.Error("comp_sharelog.store_error");
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
                        }
                    }
                    catch (error) {
                        Logger.Error(`Could not share log ${this.Params.file.Filename}: `, error);
                        this.modalCtrl.dismiss(null, "cancel");
                    }
                }
                else if (this.do.value == "email") {
                    const email_title = this.Locale.getText("comp_sharelog.share_email.title", { package: meta.Package?.Name, platform: meta.Device.Platform, file: this.Params.file.Filename, size: FileUtils.File.FormatSize(this.Params.file.Size) });
                    if (await ShareUtil.SendMail({ sendto: AppService.EMailAddress, files: this.Params.file.Path, title: email_title, text: this.Locale.getText("comp_sharelog.share_email.text") })) {
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

export const ShareLogfile = async function(modalController: ModalController, params: ShareLogParams): Promise<boolean> {
    const modal = await modalController.create({
        component: StoreLogComponent,
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

declare type ShareLogParams = {
    file: FileUtils.File,
};

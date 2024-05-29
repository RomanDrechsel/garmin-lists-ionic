import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonText, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { FileUtils } from "../../classes/utils/fileutils";
import { AppService } from "../../services/app/app.service";
import { Logger } from "../../services/logging/logger";
import { PopupsService } from "../../services/popups/popups.service";

@Component({
    selector: "app-store-file",
    standalone: true,
    imports: [IonContent, IonText, IonInput, IonButtons, IonButton, IonTitle, IonIcon, IonToolbar, IonHeader, CommonModule, TranslateModule],
    templateUrl: "./store-file.component.html",
    styleUrl: "./store-file.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreFileComponent {
    public Title?: String;
    public Text!: String;
    public File!: FileUtils.File;
    public ButtonText!: string;

    private readonly Popups = inject(PopupsService);
    private readonly modalCtrl = inject(ModalController);

    public cancel() {
        this.modalCtrl.dismiss(null, "cancel");
    }

    public async storeFile() {
        if (this.File && this.File.Exists) {
            try {
                if (Capacitor.isNativePlatform()) {
                    AppService.AppToolbar?.ToggleProgressbar(true);
                    await Filesystem.copy({ from: this.File.Path, to: this.File.Filename + ".txt", toDirectory: Directory.Documents });
                    AppService.AppToolbar?.ToggleProgressbar(false);
                } else {
                    var a = document.createElement("a");
                    a.style.display = "none";
                    var file = new Blob([this.File.Content!], { type: "text/plain" });
                    a.href = URL.createObjectURL(file);
                    a.download = this.File.Filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
                Logger.Debug(`Stored log ${this.File.Filename} in DOCUMENTS`);
                this.modalCtrl.dismiss(null, "confirm");
                if (Capacitor.isNativePlatform()) {
                    this.Popups.Toast.Success("page_settings_showlogs.store_success");
                }
            } catch (error) {
                Logger.Error(`Could not store log ${this.File.Filename} in DOCUMENTS: `, error);
                this.modalCtrl.dismiss(null, "cancel");
                this.Popups.Toast.Error("page_settings_showlogs.store_error");
            }
        }
    }
}

export const StoreFile = async function (modalController: ModalController, params: DownloadLinkParams): Promise<boolean> {
    const modal = await modalController.create({
        component: StoreFileComponent,
        componentProps: { Title: params.title, Text: params.text, File: params.file, ButtonText: params.button },
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

declare type DownloadLinkParams = {
    title?: string;
    text: string;
    button: string;
    file: FileUtils.File;
};

import { Component, inject, type OnInit } from "@angular/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { IonButton, IonToggle, ModalController, NavController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { EPrefProperty, PreferencesService } from "src/app/services/storage/preferences.service";

@Component({
    selector: "app-listago",
    imports: [IonToggle, TranslateModule, IonButton],
    templateUrl: "./listago.component.html",
    styleUrls: ["./listago.component.scss"],
    standalone: true,
})
export class ListagoComponent implements OnInit {
    private readonly _preferences = inject(PreferencesService);
    private readonly _navController = inject(NavController);
    private readonly _modalController = inject(ModalController);
    private _showPopup: boolean = false;

    public readonly HideTimeDays = 30;

    public get HidePopup() {
        return !this._showPopup;
    }

    public async ngOnInit() {
        this._showPopup = (await this._preferences.Get(EPrefProperty.ListagoHint, -1)) > 0;
    }

    public async togglePopup(checked: boolean) {
        if (checked) {
            const ts = Date.now() + 1000 * 60 * 60 * 24 * this.HideTimeDays;
            await this._preferences.Set(EPrefProperty.ListagoHint, ts);
        } else {
            await this._preferences.Remove(EPrefProperty.ListagoHint);
        }
        this._showPopup = !checked;
    }

    public async googlePlay() {
        await AppLauncher.openUrl({ url: "https://play.google.com/store/apps/details?id=de.romandrechsel.listago" });
    }

    public async startSwitch() {
        this._modalController.dismiss();
        this._navController.navigateForward("settings/listago");
    }
}

export const ShowListagoHint = async function (modalController: ModalController): Promise<void> {
    const modal = await modalController.create({
        component: ListagoComponent,
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: "autosize-modal",
    });
    modal.present();
    await modal.onWillDismiss();
};

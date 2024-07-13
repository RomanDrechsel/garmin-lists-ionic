import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { SelectCustomEvent } from "@ionic/angular";
import { IonButton, IonCol, IonContent, IonGrid, IonIcon, IonInput, IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonRow, IonSelect, IonSelectOption, IonText, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-settings",
    templateUrl: "./settings.page.html",
    styleUrls: ["./settings.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonToggle, IonNote, IonIcon, IonLabel, MainToolbarComponent, IonInput, CommonModule, TranslateModule, FormsModule, ReactiveFormsModule, RouterModule, IonContent, IonList, IonItemDivider, IonItem, IonSelect, IonSelectOption, IonRow, IonCol, IonGrid, IonButton, IonText],
})
export class SettingsPage extends PageBase {
    private _openAppOnTransfer: boolean = false;

    public get OpenAppOnTransmit(): boolean {
        return this._openAppOnTransfer;
    }

    public set OpenAppOnTransmit(v: boolean) {
        this._openAppOnTransfer = v;
        this.Preferences.Set(EPrefProperty.OpenAppOnTransmit, v);
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._openAppOnTransfer = await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, true);
        this.cdr.detectChanges();
    }

    public onChangeLanguage(event: SelectCustomEvent) {
        this.Locale.ChangeLanguage(event.detail.value);
    }

    public async onOpenAppOnTransmitChanged(checked: boolean) {
        this.OpenAppOnTransmit = checked;
    }
}

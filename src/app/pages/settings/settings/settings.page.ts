import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { SelectCustomEvent } from "@ionic/angular";
import { IonButton, IonCol, IonContent, IonGrid, IonIcon, IonInput, IonItem, IonItemDivider, IonLabel, IonList, IonNote, IonRow, IonSelect, IonSelectOption, IonText, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { ShareUtil } from "../../../classes/utils/share-utils";
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
    public get Email(): string {
        return this.Config.EMailAddress;
    }

    public onChangeLanguage(event: SelectCustomEvent) {
        this.Locale.ChangeLanguage(event.detail.value);
    }

    public async reportTranslationMistake() {
        if (
            await this.Popups.Alert.YesNo({
                message: "page_settings.translation_error_confirm",
                translate: true,
            })
        ) {
            await ShareUtil.SendMail({ sendto: this.Config.EMailAddress, title: this.Locale.getText("page_settings.translation_error_title") });
        }
    }
}

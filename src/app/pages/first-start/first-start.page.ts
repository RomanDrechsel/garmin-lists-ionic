import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Browser } from "@capacitor/browser";
import { IonButton, IonContent, IonIcon, IonImg, IonTab, IonTabBar, IonTabButton, IonTabs, IonText, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { PageBase } from "../page-base";

@Component({
    selector: "app-first-start",
    templateUrl: "./first-start.page.html",
    styleUrls: ["./first-start.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonButton, IonText, IonToggle, IonTab, IonImg, IonContent, IonTabs, IonTabBar, IonTabButton, IonIcon, CommonModule, FormsModule, TranslateModule],
})
export class FirstStartPage extends PageBase {
    public get HomepageLink(): string {
        return this.Config.Homepage;
    }

    public override async ionViewDidEnter(): Promise<void> {
        await super.ionViewDidEnter();
        await this.Preferences.Set(EPrefProperty.GarminConnectIQ, true);
    }

    public async onGarminChange(check: boolean) {
        await this.Preferences.Set(EPrefProperty.GarminConnectIQ, check);
        if (check) {
            await this.ConnectIQ.Initialize();
        } else {
            await this.ConnectIQ.Finalize();
        }
    }

    public async Finish() {
        this.NavController.navigateForward("");
    }

    public async openApp() {
        await this.ConnectIQ.openStore();
    }

    public async openHomepage() {
        await Browser.open({ url: `https://${this.Config.Homepage}` });
    }
}

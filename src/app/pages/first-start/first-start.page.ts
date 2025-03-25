import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Browser } from "@capacitor/browser";
import { IonButton, IonContent, IonIcon, IonImg, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonSelect, IonSelectOption, IonText, IonToggle } from "@ionic/angular/standalone";
import { SelectCustomEvent } from "@ionic/core";
import { TranslateModule } from "@ngx-translate/core";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { PageBase } from "../page-base";

@Component({
    selector: "app-first-start",
    templateUrl: "./first-start.page.html",
    styleUrls: ["./first-start.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonSegmentButton, IonSegment, IonSegmentContent, IonSegmentView, IonButton, IonText, IonToggle, IonImg, IonContent, IonIcon, IonSelect, IonSelectOption, CommonModule, FormsModule, TranslateModule],
})
export class FirstStartPage extends PageBase {
    @ViewChild("segment", { static: false, read: IonSegment }) segment?: IonSegment;
    @ViewChild("selLanguage", { static: false, read: IonSelect }) selLanguage?: IonSelect;

    private _garminActive: boolean = true;

    public get HomepageLink(): string {
        return this.Config.Homepage;
    }

    public get GarminActive(): boolean {
        return this._garminActive;
    }

    public override async ionViewDidEnter(): Promise<void> {
        await super.ionViewDidEnter();
        await this.Preferences.Set(EPrefProperty.GarminConnectIQ, true);
        if (this.segment) {
            this.segment.value = "language";
        }
    }

    public async changeLanguage() {
        this.selLanguage?.open();
    }

    public onChangeLanguage(event: SelectCustomEvent) {
        this.Locale.ChangeLanguage(event.detail.value);
    }

    public async segmentChange(segment: any): Promise<void> {
        if (segment == "garmin-hint") {
            if (this._garminActive && !this.ConnectIQ.Initialized) {
                await this.ConnectIQ.Initialize();
            }
        }
    }

    public async onGarminChange(check: boolean) {
        this._garminActive = check;
        await this.Preferences.Set(EPrefProperty.GarminConnectIQ, check);
        if (check) {
            await this.ConnectIQ.Initialize();
        } else {
            await this.ConnectIQ.Shutdown();
        }
    }

    public async nextLanguage() {
        this.gotoSegment("garmin");
    }

    public async nextGarmin() {
        const nextSegment = this.GarminActive ? "garmin-hint" : "finish";
        this.gotoSegment(nextSegment);
    }

    public async nextGarminHint() {
        this.gotoSegment("finish");
    }

    public async Finish() {
        await this.Preferences.Set(EPrefProperty.FirstStart, false);
        this.NavController.navigateRoot("/lists", { animated: true, replaceUrl: true });
    }

    public async openApp() {
        await this.ConnectIQ.openStore();
    }

    public async openHomepage() {
        await Browser.open({ url: `https://${this.Config.Homepage}` });
    }

    private async gotoSegment(segment: string) {
        if (this.segment) {
            this.segment.value = segment;
            this.segmentChange(segment);
            this.cdr.detectChanges();
        }
    }
}

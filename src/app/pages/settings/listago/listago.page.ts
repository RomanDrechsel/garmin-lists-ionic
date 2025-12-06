import { CommonModule } from "@angular/common";
import { Component, ElementRef, inject, ViewChild } from "@angular/core";
import { App } from "@capacitor/app";
import { AppLauncher } from "@capacitor/app-launcher";
import type { PluginListenerHandle } from "@capacitor/core";
import { IonButton, IonContent, IonIcon, IonModal, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, NavController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import SysInfo from "src/app/plugins/sysinfo/sys-info";
import { LocalizationService } from "src/app/services/localization/localization.service";
import { EPrefProperty, PreferencesService } from "src/app/services/storage/preferences.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-listago",
    templateUrl: "./listago.page.html",
    styleUrls: ["./listago.page.scss"],
    standalone: true,
    imports: [IonModal, IonButton, IonContent, IonSegmentView, IonSegmentContent, IonSegment, IonSegmentButton, IonIcon, CommonModule, MainToolbarComponent, TranslateModule],
})
export class ListagoPage extends PageBase {
    private readonly _navController = inject(NavController);
    private readonly _preferences = inject(PreferencesService);
    private readonly _locale = inject(LocalizationService);
    private _listagoInstalled = false;
    private _appResumeListener?: PluginListenerHandle;
    private _screenshot?: string = undefined;
    private _showScreenshotPopup = false;

    @ViewChild("segbtnExport", { static: false, read: ElementRef }) private _segbtnExport?: ElementRef;

    public get ListagoInstalled() {
        return this._listagoInstalled;
    }

    public get Screenshot(): string | undefined {
        return this._screenshot;
    }

    public get showScreenshotPopup(): boolean {
        return this._showScreenshotPopup;
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this._listagoInstalled = (await SysInfo.AppInstalled({ packageName: "de.romandrechsel.listago", silent: false })).installed;
        this._appResumeListener = await App.addListener("resume", async () => {
            this._listagoInstalled = (await SysInfo.AppInstalled({ packageName: "de.romandrechsel.listago", silent: false })).installed;
        });

        this._preferences.onPrefChanged$.subscribe(pref => {
            if (pref.prop == EPrefProperty.AppLanguage) {
                this.checkForScreenshot();
            }
        });

        this.checkForScreenshot();
    }

    public override async ionViewWillLeave(): Promise<void> {
        super.ionViewWillLeave();
        this._appResumeListener?.remove();
        this._appResumeListener = undefined;
    }

    public nextExport() {
        this._segbtnExport?.nativeElement?.click();
    }

    public async startExport() {
        await this._navController.navigateForward("settings/export", { queryParams: { highlight_listago: "1" } });
    }

    public async googlePlay() {
        await AppLauncher.openUrl({ url: "https://play.google.com/store/apps/details?id=de.romandrechsel.listago" });
    }

    public screenshotPopup() {
        this._showScreenshotPopup = true;
    }

    public onScreenshotPopupDismiss() {
        this._showScreenshotPopup = false;
    }

    public closeScreenshotPopup() {
        this._showScreenshotPopup = false;
    }

    private async checkForScreenshot(): Promise<void> {
        const screenshot = `/assets/i18n/img/listago/listago-export-screenshot-${this._locale.CurrentLanguage.localeFile}.png`;

        const img = new Image();
        img.src = screenshot;
        const check = new Promise<boolean>(resolve => {
            if (img.complete) {
                resolve(true);
            } else {
                img.onload = () => {
                    resolve(true);
                };

                img.onerror = () => {
                    resolve(false);
                };
            }
        });

        if (await check) {
            this._screenshot = screenshot;
        } else {
            this._screenshot = undefined;
        }
    }
}

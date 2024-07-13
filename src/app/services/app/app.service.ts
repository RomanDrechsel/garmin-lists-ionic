import { Injectable, inject, isDevMode } from "@angular/core";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Platform } from "@ionic/angular";
import { StringUtils } from "../../classes/utils/stringutils";
import { MainToolbarComponent } from "../../components/main-toolbar/main-toolbar.component";
import { AdmobService } from "../adverticing/admob.service";
import { ConnectIQService } from "../connectiq/connect-iq.service";
import { ListsService } from "../lists/lists.service";
import { Locale } from "../localization/locale";
import { LocalizationService } from "../localization/localization.service";
import { Logger } from "../logging/logger";
import { LoggingService } from "../logging/logging.service";
import { ConfigService } from "../storage/config.service";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class AppService {
    /** object with app info */
    public static AppInfo: AppInfo;
    public static AppToolbar?: MainToolbarComponent;

    public readonly loggerService = inject(LoggingService);

    public readonly Config = inject(ConfigService);
    public readonly Locale = inject(LocalizationService);
    public readonly ListsService = inject(ListsService);
    public readonly ConnectIQ = inject(ConnectIQService);
    public readonly Platform = inject(Platform);
    public readonly Preferences = inject(PreferencesService);
    public readonly Admob = inject(AdmobService);

    /** platform as short string (android, ios, web) */
    public static get AppPlatform(): string {
        return Capacitor.getPlatform();
    }

    /** get platform as a readable string  */
    public static get AppPlatformString(): string {
        const platform = Capacitor.getPlatform();
        if (platform == "ios") {
            return "iOS";
        } else {
            return StringUtils.capitalize(platform);
        }
    }

    /** app running on a native device? */
    public static get isMobileApp(): boolean {
        const platform = AppService.AppPlatform;
        return platform === "ios" || platform === "android";
    }

    /** app running on a webbrowser? */
    public static get isWebApp(): boolean {
        return AppService.AppPlatform === "web";
    }

    /**
     * initialize app services
     */
    public async InitializeApp() {
        AppService.AppInfo = await this.GetAppInfo();
        await Logger.Initialize(this.loggerService);
        await Locale.Initialize(this.Locale);
        await this.ListsService.Initialize();

        await this.Admob.Initialize();
        await this.Admob.ShowBanner();

        const debugmode = await this.Preferences.Get<boolean>(EPrefProperty.DebugDevices, isDevMode());
        await this.ConnectIQ.Initialize(debugmode);
    }

    /**
     * width of display resolution
     */
    public get DeviceWidth(): number {
        return this.Platform.width();
    }

    /**
     * height of display resolution
     */
    public get DeviceHeight(): number {
        return this.Platform.height();
    }

    /**
     * is the device in darkmode?
     */
    public static get Darkmode(): boolean {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    /**
     * get info about the app instance
     * @returns app info
     */
    private async GetAppInfo(): Promise<AppInfo> {
        const appinfo: AppInfo = {
            AppName: "Lists",
            PackageName: this.Config.BundleId,
            VersionString: this.Config.VersionString,
            Build: this.Config.Build,
            Platform: (await Device.getInfo()).platform,
            Identifier: (await Device.getId()).identifier,
        };

        if (AppService.isMobileApp) {
            const info = await App.getInfo();
            appinfo.AppName = info.name;
            appinfo.PackageName = info.id;
            appinfo.VersionString = info.version;
            appinfo.Build = parseInt(info.build);
        }

        return appinfo;
    }
}

export declare type AppInfo = {
    AppName: string;
    PackageName: string;
    VersionString: string;
    Build: number;
    Platform: "android" | "ios" | "web";
    Identifier: string;
};

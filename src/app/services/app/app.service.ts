import { inject, Injectable, isDevMode } from "@angular/core";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Platform } from "@ionic/angular";
import { NavController } from "@ionic/angular/standalone";
import { environment } from "../../../environments/environment";
import { StringUtils } from "../../classes/utils/string-utils";
import { MainToolbarComponent } from "../../components/main-toolbar/main-toolbar.component";
import { AdmobService } from "../adverticing/admob.service";
import { ConnectIQService } from "../connectiq/connect-iq.service";
import { ListsService } from "../lists/lists.service";
import { Locale } from "../localization/locale";
import { LocalizationService } from "../localization/localization.service";
import { Logger } from "../logging/logger";
import { LoggingService } from "../logging/logging.service";
import { PopupsService } from "../popups/popups.service";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { ConfigService } from "./../config/config.service";

@Injectable({
    providedIn: "root",
})
export class AppService {
    public static AppToolbar?: MainToolbarComponent;

    public readonly Logger = inject(LoggingService);
    public readonly Locale = inject(LocalizationService);
    public readonly ListsService = inject(ListsService);
    public readonly ConnectIQ = inject(ConnectIQService);
    public readonly Platform = inject(Platform);
    public readonly Preferences = inject(PreferencesService);
    public readonly Admob = inject(AdmobService);
    public readonly NavController = inject(NavController);
    public readonly Config = inject(ConfigService);

    private readonly _popups = inject(PopupsService);
    public static Popups: PopupsService;

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
        AppService.Popups = this._popups;
        await Logger.Initialize(this.Logger);
        await Locale.Initialize(this.Locale);
        await this.ListsService.Initialize();

        //no await ...
        (async () => {
            if ((await this.Preferences.Get(EPrefProperty.FirstStart, true)) == false && (await this.Preferences.Get<boolean>(EPrefProperty.GarminConnectIQ, true))) {
                const garmin_simulator = isDevMode() ? await this.Preferences.Get<boolean>(EPrefProperty.DebugSimulator, true) : false;
                const garmin_debugapp = isDevMode() ? await this.Preferences.Get<boolean>(EPrefProperty.DebugApp, false) : false;
                await this.ConnectIQ.Initialize({ simulator: garmin_simulator, debug_app: garmin_debugapp });
            } else {
                this.Logger.Notice(`Starting without ConnectIQ support`);
            }
        })();

        //no await...
        this.Admob.Initialize();
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
     * get info about the app instance and the device
     * @returns app meta information
     */
    public async AppMetaInfo(query?: { device?: boolean; settings?: boolean; storage?: boolean; garmin?: boolean }): Promise<AppMetaInfo> {
        const meta: AppMetaInfo = {};
        if (!query || query.device !== false) {
            const deviceinfo = await Device.getInfo();
            meta.Device = {
                Identifier: (await Device.getId()).identifier,
                Model: deviceinfo.model,
                Platform: deviceinfo.platform,
                OperatingSystem: {
                    OS: deviceinfo.operatingSystem,
                    Version: deviceinfo.osVersion,
                    AndroidSDKVersion: deviceinfo.androidSDKVersion,
                },
                Resolution: `${this.DeviceWidth}x${this.DeviceHeight}`,
                Manufacturer: deviceinfo.manufacturer,
                isVirtual: deviceinfo.isVirtual,
                MemoryUsed: deviceinfo.memUsed,
                WebViewVersion: deviceinfo.webViewVersion,
            };
        }

        if (!query || query.settings !== false) {
            meta.Settings = {
                LogMode: this.Logger.LogLevelShort,
                AppLanguage: this.Locale.CurrentLanguage.locale,
                AdmobStatus: {
                    Initialized: this.Admob.Initialized,
                    Status: await this.Admob.getConsentStatus(),
                },
            };
        }

        if (!query || query.storage !== false) {
            const database = await this.ListsService.BackendSize();
            const logs = await this.Logger.GetLogSize();
            meta.Storage = {
                Lists: {
                    Count: database.lists.files,
                    Size: database.lists.size,
                },
                Trash: {
                    Count: database.trash.files,
                    Size: database.trash.size,
                },
                Logs: {
                    Count: logs.files,
                    Size: logs.size,
                },
            };
        }

        if (AppService.isMobileApp) {
            const info = await App.getInfo();
            meta.Package = {
                AppName: info.name,
                Name: info.id,
                VersionString: info.version,
                Build: parseInt(info.build),
                Environment: environment.production ? "Production" : "Development",
                Release: environment.publicRelease,
            };
        }

        if (this.ConnectIQ.Initialized) {
            const devices = query?.garmin
                ? (await this.ConnectIQ.getDevices()).map(device => {
                      return {
                          Identifier: device.Identifier,
                          Name: device.Name,
                          State: device.State,
                      };
                  })
                : undefined;

            meta.ConnectIQ = {
                Initialized: true,
                Devices: devices,
            };
        } else {
            meta.ConnectIQ = {
                Initialized: false,
            };
        }

        return meta;
    }
}

export declare type AppMetaInfo = {
    Settings?: {
        LogMode: string;
        AppLanguage: string;
        AdmobStatus: {
            Initialized: boolean;
            Status: any;
        };
    };
    Device?: {
        Identifier: string;
        Resolution: string;
        Model: string;
        Platform: "android" | "ios" | "web";
        OperatingSystem: {
            OS: string;
            Version: string;
            AndroidSDKVersion: number | undefined;
        };
        Manufacturer: string;
        isVirtual: boolean;
        MemoryUsed: number | undefined;
        WebViewVersion: string;
    };
    Storage?: {
        Lists: {
            Count: number;
            Size: number;
        };
        Trash: {
            Count: number;
            Size: number;
        };
        Logs: {
            Count: number;
            Size: number;
        };
    };
    Package?: {
        Name: string;
        AppName: string;
        VersionString: string;
        Build: number;
        Environment: "Production" | "Development";
        Release: boolean;
    };
    ConnectIQ?: {
        Initialized: boolean;
        Devices?: any;
    };
};

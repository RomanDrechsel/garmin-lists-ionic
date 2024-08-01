import { Device } from "@capacitor/device";
import { environment } from "../../environments/environment";
import { AppService } from "../services/app/app.service";

export const AppMetaData = async function(app: AppService) {
    const appInfo = await Device.getInfo();

    return {
        Environment: environment.production ? "Production" : "Development",
        Release: environment.publicRelease,
        LogMode: app.loggerService.LogLevelShort,
        Resolution: `${app.DeviceWidth}x${app.DeviceHeight}`,
        DeviceIdentifier: AppService.AppInfo.Identifier,
        AppLanguage: app.Locale.CurrentLanguage.locale,
        Device: appInfo
    };
};

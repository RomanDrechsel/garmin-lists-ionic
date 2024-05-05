import { Device } from "@capacitor/device";
import { AppService } from "../services/app/app.service";

export const AppMetaData = async function(app: AppService) {
    const appInfo = await Device.getInfo();

    return {
        LogMode: app.loggerService.LogLevelShort,
        Resolution: `${app.DeviceWidth}x${app.DeviceHeight}`,
        DeviceIdentifier: AppService.AppInfo.Identifier,
        AppLanguage: app.Locale.currentLang,
        Device: appInfo
    };
};

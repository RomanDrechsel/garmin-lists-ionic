import { NavController } from "@ionic/angular/standalone";
import { StringUtils } from "../../../classes/utils/string-utils";
import { ConnectIQService } from "../../../services/connectiq/connect-iq.service";
import { Logger } from "../../../services/logging/logger";
import { PopupsService } from "../../../services/popups/popups.service";
import { ConnectIQDeviceMessage } from "../event-args/connect-iq-device-message.";
import { DeviceMessageEventArgs } from "../event-args/device-message-event-args.";
import { ConnectIQListener } from "./connect-iq-listener";

export class DeviceErrorReportListener extends ConnectIQListener<DeviceMessageEventArgs> {
    private readonly _navController: NavController;
    private readonly _popup: PopupsService;

    constructor(service: ConnectIQService, nav: NavController, popup: PopupsService) {
        super(service);
        this._navController = nav;
        this._popup = popup;
    }

    public override Event(): string {
        return "RECEIVE";
    }

    protected override async Callback(obj: DeviceMessageEventArgs): Promise<void> {
        const data = new ConnectIQDeviceMessage(obj, this._service);
        if (data.Message.type && data.Message.type == "reportError") {
            let logreport = ["", "===========", `Received error report from device ${data.Device}:`, `Message: ${data.Message.errorMsg ?? "-"}`, `Code: ${data.Message.errorCode ?? "-1"}`];
            if (data.Message.errorPayload) {
                logreport.push(`Payload: ${StringUtils.toString(data.Message.errorPayload)}`);
            }
            if (data.Message.logs && Array.isArray(data.Message.logs)) {
                logreport.push("", "Watch logs:");
                logreport.push(...data.Message.logs);
            }
            logreport.push("===========", "");
            Logger.Error(logreport.join("\n"));

            if (await this._popup.Alert.YesNo({ message: "comp_sharelog.error_report_confirm", translate: true })) {
                await this._navController.navigateForward("settings/logs", {
                    queryParams: {
                        errorReport: true,
                    },
                });
            }
        }
    }
}

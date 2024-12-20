import { Logger } from "../../../services/logging/logger";
import { DeviceEventArgs } from "../event-args/device-event-args";
import { ConnectIQListener } from "./connect-iq-listener";

export class DeviceListener extends ConnectIQListener<DeviceEventArgs> {
    public Event(): string {
        return "DEVICE";
    }

    protected async Callback(device: DeviceEventArgs): Promise<boolean> {
        if (device) {
            Logger.Debug("Device state changed: ", device);
            this._service.UpdateDevice(device);
        }
        return true;
    }
}

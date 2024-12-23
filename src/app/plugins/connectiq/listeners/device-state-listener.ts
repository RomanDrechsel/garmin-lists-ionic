import { Logger } from "../../../services/logging/logger";
import { DeviceEventArgs } from "../event-args/device-event-args";
import { ConnectIQListener } from "./connect-iq-listener";

export class DeviceStateListener extends ConnectIQListener<DeviceEventArgs> {
    public Event(): string {
        return "DEVICE";
    }

    protected async Callback(device: DeviceEventArgs): Promise<void> {
        if (device) {
            Logger.Debug("Device state changed: ", device);
            this._service.UpdateDevice(device);
        }
    }
}

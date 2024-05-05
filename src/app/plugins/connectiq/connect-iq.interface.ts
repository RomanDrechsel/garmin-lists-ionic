import { Plugin, PluginListenerHandle } from "@capacitor/core";
import { DeviceEventArgs } from "./EventArgs/device-event-args";
import { DevicesEventArgs } from "./EventArgs/devices-event-args";
import { TransmitListEventArgs } from "./EventArgs/transmit-list-event-args";

export interface IConnectIQ extends Plugin {
    Initialize(opts: { live: boolean; }): Promise<void>;

    GetDevices(opts: { force_reload: boolean; }): Promise<DevicesEventArgs>;

    GetDevice(opts: { device_id: string; }): Promise<DeviceEventArgs>;

    SendToDevice(opts: { device_id: string, data: string; }): Promise<TransmitListEventArgs>;

    OpenStore(): Promise<void>;

    addListener<T>(eventName: string, listenerFunc: (data: T) => void): Promise<PluginListenerHandle>;
}

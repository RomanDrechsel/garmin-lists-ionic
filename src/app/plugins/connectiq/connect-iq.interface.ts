import { Plugin, PluginListenerHandle } from "@capacitor/core";
import { DeviceEventArgs } from "./event-args/device-event-args";
import { DevicesEventArgs } from "./event-args/devices-event-args";
import { TransmitListEventArgs } from "./event-args/transmit-list-event-args";

export interface IConnectIQ extends Plugin {
    Initialize(opts: { live: boolean }): Promise<void>;

    GetDevices(opts: { force_reload: boolean }): Promise<DevicesEventArgs>;

    GetDevice(opts: { device_id: string }): Promise<DeviceEventArgs>;

    SendToDevice(opts: { device_id: string; data: string }): Promise<TransmitListEventArgs>;

    OpenStore(): Promise<void>;

    addListener<T>(eventName: string, listenerFunc: (data: T) => void): Promise<PluginListenerHandle>;
}

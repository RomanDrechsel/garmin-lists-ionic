import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Browser } from "@capacitor/browser";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { BehaviorSubject, interval, Subscription } from "rxjs";
import { LogEventArgs } from "src/app/plugins/connectiq/event-args/log-event-args";
import { DebugDevices, environment } from "../../../environments/environment";
import ConnectIQ from "../../plugins/connectiq/connect-iq";
import { ConnectIQDeviceMessage } from "../../plugins/connectiq/event-args/connect-iq-device-message.";
import { DeviceEventArgs } from "../../plugins/connectiq/event-args/device-event-args";
import { TransmitDataEventArgs } from "../../plugins/connectiq/event-args/transmit-data-event-args";
import { AppService } from "../app/app.service";
import { ListsService } from "../lists/lists.service";
import { Locale } from "../localization/locale";
import { LocalizationService } from "../localization/localization.service";
import { PopupsService } from "../popups/popups.service";
import { Toast } from "../popups/toast";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { DeviceMessageEventArgs } from "./../../plugins/connectiq/event-args/device-message-event-args.";
import { Logger } from "./../logging/logger";
import { ConnectIQDevice } from "./connect-iq-device";
import { ConnectIQResponseListener } from "./connect-iq-response-listener.";

@Injectable({
    providedIn: "root",
})
export class ConnectIQService {
    private _alwaysTransmitToDevice?: ConnectIQDevice;
    private _logListener?: PluginListenerHandle;
    private _deviceListener?: PluginListenerHandle;
    private _receiverListener?: PluginListenerHandle;

    private _devices: ConnectIQDevice[] = [];

    public isDebugMode = false;

    private onInitializedSubject = new BehaviorSubject<void>(undefined);
    public onInitialized$ = this.onInitializedSubject.asObservable();
    private onDeviceChangedSubject = new BehaviorSubject<ConnectIQDevice | undefined>(undefined);
    public onDeviceChanged$ = this.onDeviceChangedSubject.asObservable();
    private onMessageReceivedSubject = new BehaviorSubject<{ device: ConnectIQDevice; message?: ConnectIQDeviceMessage } | undefined>(undefined);
    public onMessageReceived$ = this.onMessageReceivedSubject.asObservable();

    private readonly DEFAULT_PENDING_RESPONSE_TIMEOUT: number = 10;
    private _pendingResponses: ConnectIQResponseListener[] = [];
    private _pendingResponsesTimoutCheck?: Subscription = undefined;

    private readonly Locale = inject(LocalizationService);
    private readonly Popups = inject(PopupsService);
    private readonly Preferences = inject(PreferencesService);
    private readonly ListsService = inject(ListsService);
    private readonly Router = inject(Router);

    public set AlwaysTransmitToDevice(device: ConnectIQDevice | undefined) {
        this.Preferences.Set(EPrefProperty.AlwaysTransmitTo, device?.Identifier);
        this._alwaysTransmitToDevice = device;
    }

    public get AlwaysTransmitToDevice(): ConnectIQDevice | undefined {
        return this._alwaysTransmitToDevice;
    }

    /**
     * initialize service
     * @param debug_devices use debug devices or live devices
     */
    public async Initialize(debug_devices: boolean = true) {
        if (Capacitor.isNativePlatform()) {
            if (!this._logListener) {
                this._logListener = await this.addListener<LogEventArgs>("LOG", log => {
                    switch (log.level) {
                        case "debug":
                            Logger.Debug(`${log.tag}: ${log.message}`, log.obj);
                            break;
                        case "notice":
                            Logger.Notice(`${log.tag}: ${log.message}`, log.obj);
                            break;
                        case "important":
                            Logger.Important(`${log.tag}: ${log.message}`, log.obj);
                            break;
                        case "error":
                            Logger.Error(`${log.tag}: ${log.message}`, log.obj);
                            break;
                    }
                });
            }
            if (!this._deviceListener) {
                this._deviceListener = await this.addListener<DeviceEventArgs>("DEVICE", device => {
                    if (device) {
                        this._devices.find(d => d.Identifier == device.id)?.Update(device);
                        this.onDeviceChangedSubject.next(ConnectIQDevice.FromEventArgs(device, this));
                    }
                });
            }
            if (!this._receiverListener) {
                this._receiverListener = await this.addListener<DeviceMessageEventArgs>("RECEIVE", async obj => {
                    if (obj) {
                        const message = new ConnectIQDeviceMessage(obj, this);
                        Logger.Debug("Received message from device:", message.Device, message.Message);
                        if ((await this.handleResponse(message)) == false) {
                            this.onMessageReceivedSubject.next({ device: ConnectIQDevice.FromEventArgs(obj.device, this), message: message });
                        }
                    }
                });
            }
            this._devices = [];
            await ConnectIQ.Initialize({ live_devices: !debug_devices, live_app: environment.publicRelease });
            this.isDebugMode = debug_devices;

            const defaultTransmitDevice = await this.Preferences.Get<number>(EPrefProperty.AlwaysTransmitTo, -1);
            this._alwaysTransmitToDevice = await this.GetDevice(defaultTransmitDevice);
            this.onInitializedSubject.next();
        }
    }

    /**
     * get all known devices
     * @param force_load force to reload device list and states
     * @returns list of all known devices
     */
    public async getDevices(force_load: boolean = false): Promise<ConnectIQDevice[]> {
        if (!force_load && this._devices.length > 0) {
            return this._devices;
        }
        const defaultTransmitDevice = await this.Preferences.Get<number>(EPrefProperty.AlwaysTransmitTo, -1);
        let devices: ConnectIQDevice[] = [];

        if (Capacitor.isNativePlatform()) {
            try {
                const res = await ConnectIQ.GetDevices({ force_reload: force_load });
                if (res && res.devices) {
                    const array = JSON.parse(res.devices);
                    if (Array.isArray(array)) {
                        array.forEach((d: any) => {
                            let device = this._devices.find(d2 => d2.Identifier == d.id);
                            if (device) {
                                device.Update(d);
                            } else {
                                device = ConnectIQDevice.FromEventArgs(d, this);
                            }
                            devices.push(device);
                        });
                    }
                }
            } catch (error) {
                Logger.Error("Could not parse device infos");
            }
        }

        if (devices.length == 0) {
            devices = DebugDevices(this);
        }

        this._alwaysTransmitToDevice = undefined;
        if (defaultTransmitDevice > 0) {
            this._alwaysTransmitToDevice = devices.find(d => d.Identifier == defaultTransmitDevice);
        }
        if (this._alwaysTransmitToDevice) {
            Logger.Debug(`Lists will be transmited to device ${this._alwaysTransmitToDevice.Identifier} by default`);
        }
        this._devices = devices;
        return this._devices;
    }

    /**
     * get a specific device
     * @param id unique device id
     * @returns device object
     */
    public async GetDevice(id: number): Promise<ConnectIQDevice | undefined> {
        if (this._devices.length <= 0) {
            await this.getDevices(true);
        }

        return this._devices.find(d => d.Identifier == id);
    }

    /**
     * opens the playstore
     */
    public async openStore() {
        //await ConnectIQ.OpenStore();
        await Browser.open({ url: `https://apps.garmin.com/${Locale.currentLang().locale}apps/c04a5671-7e39-46e7-b911-1911dbb2fe05` });
    }

    /**
     * opens the app on the watch
     */
    public async openApp(device: ConnectIQDevice): Promise<void> {
        await ConnectIQ.OpenApp({ device_id: String(device.Identifier) });
    }

    /**
     * transmit al list to a device
     * @param uuid unique id of the list
     * @param device device object
     * @param force force transmitting to the device without going to devices page if something goes wrong
     * @returns transmit successful or not
     */
    public async TransmitList(uuid: string, device?: ConnectIQDevice, force: boolean = false, routeAfterTransmit?: string): Promise<boolean> {
        let resp: TransmitDataEventArgs | undefined = { success: false };
        let redirect = false;

        const list = await this.ListsService.GetList(uuid);
        if (!list) {
            return false;
        }

        if (Capacitor.isNativePlatform()) {
            if (!device) {
                if (this._alwaysTransmitToDevice) {
                    device = this._alwaysTransmitToDevice;
                } else if (this._devices.length == 1) {
                    device = this._devices[0];
                }
            }

            if (device && device.State == "Ready") {
                const confirm = await this.Preferences.Get<boolean>(EPrefProperty.ConfirmTransmitList, true);
                const locale = this.Locale.getText(["service-connectiq.transmit_confirm", "yes", "no"], { device: device.Name });
                if (!confirm || (await this.Popups.Alert.YesNo({ message: locale["service-connectiq.transmit_confirm"], button_yes: locale["yes"], button_no: locale["no"] }))) {
                    const toast = await this.Popups.Toast.Notice("service-connectiq.transmit_process", Toast.DURATION_INFINITE);
                    AppService.AppToolbar?.ToggleProgressbar(true);
                    resp = await ConnectIQ.SendToDevice({ device_id: String(device.Identifier), json: list.toDeviceJson() });
                    toast.dismiss();
                    AppService.AppToolbar?.ToggleProgressbar(false);
                } else {
                    return true;
                }
            } else {
                redirect = true;
            }
        } else {
            redirect = true;
        }

        if (redirect && !force) {
            this.Router.navigate(["/devices"], { queryParams: { transmit: uuid, routeAfterTransmit: routeAfterTransmit } });
            return true;
        } else if (device) {
            if (resp && resp.success) {
                this.Popups.Toast.Success("service-connectiq.transmit_success");
                if (await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, true)) {
                    await this.openApp(device);
                }
                return true;
            } else {
                this.Popups.Toast.Error("service-connectiq.transmit_error");
                return false;
            }
        } else {
            this.Popups.Toast.Error("service-connectiq.transmit_error");
            Logger.Debug(`The list ${uuid} could not be transmitted: No device found`);
            return false;
        }
    }

    public async SendToDevice(obj: { device?: ConnectIQDevice | number; data: any; response?: (message?: ConnectIQDeviceMessage) => Promise<void>; timeout?: number }): Promise<boolean> {
        if (typeof obj.device === "number") {
            obj.device = await this.GetDevice(obj.device);
        }

        if (Capacitor.isNativePlatform() && !obj.device) {
            if (this._alwaysTransmitToDevice) {
                obj.device = this._alwaysTransmitToDevice;
            } else if (this._devices.length == 1) {
                obj.device = this._devices[0];
            }
        }

        if (!obj.device) {
            Logger.Debug(`Could not send data to device: no device found`);
            return false;
        }

        if (obj.response) {
            let tid = this.addResponseListener(obj.response, obj.timeout);
            obj.data.tid = tid;
        }

        return (await ConnectIQ.SendToDevice({ device_id: String(obj.device.Identifier), json: JSON.stringify(obj.data) })).success;
    }

    /**
     * adds a plugin event listener
     * @param eventName event name
     * @param listenerFunc listener function
     * @returns listener handle
     */
    public async addListener<T>(eventName: string, listenerFunc: (data: T) => void): Promise<PluginListenerHandle | undefined> {
        if (Capacitor.isNativePlatform()) {
            return await ConnectIQ.addListener<T>(eventName, listenerFunc);
        }
        return undefined;
    }

    private addResponseListener(callback: (message?: ConnectIQDeviceMessage) => Promise<void>, timeout?: number): number {
        let tid: number;
        do {
            tid = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        } while (this._pendingResponses.filter(r => r.id === tid).length > 0);
        this._pendingResponses.push({ id: tid, callback: callback, started: Date.now(), timeout: timeout ?? this.DEFAULT_PENDING_RESPONSE_TIMEOUT });
        if (!this._pendingResponsesTimoutCheck) {
            this._pendingResponsesTimoutCheck = interval(1000).subscribe(async () => {
                const timeouts = this._pendingResponses.filter(r => r.started < Date.now() - r.timeout * 1000);
                timeouts.forEach(t => {
                    Logger.Error(`Response timeout for request ${t.id} after ${t.timeout} seconds (started ${new Date(t.started).toLocaleString()})`);
                    t.callback(undefined);
                });
                this._pendingResponses = this._pendingResponses.filter(r => timeouts.indexOf(r) < 0);
                if (this._pendingResponsesTimoutCheck && this._pendingResponses.length === 0) {
                    this._pendingResponsesTimoutCheck.unsubscribe();
                    this._pendingResponsesTimoutCheck = undefined;
                }
            });
        }

        return tid;
    }

    /**
     * check if the response is an answer of a former request
     * @param resp response object
     * @returns true, if the response was awaited, else false
     */
    private async handleResponse(message: ConnectIQDeviceMessage): Promise<boolean> {
        if (message.Message && message.Message.tid) {
            const tid = Number(message.Message.tid);
            if (!Number.isNaN(tid)) {
                const pending = this._pendingResponses.find(r => r.id == tid);
                if (pending) {
                    Logger.Debug(`Received watch response for request ${tid} after ${Date.now() - pending.started} ms`, pending);

                    await pending.callback(message);
                    this._pendingResponses = this._pendingResponses.filter(r => r != pending);
                    if (this._pendingResponses.length == 0 && this._pendingResponsesTimoutCheck != null) {
                        this._pendingResponsesTimoutCheck.unsubscribe();
                        this._pendingResponsesTimoutCheck = undefined;
                    }
                    return true;
                }
            }
        }
        return false;
    }
}

import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Browser } from "@capacitor/browser";
import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { BehaviorSubject, interval, Subscription } from "rxjs";
import { LogEventArgs } from "src/app/plugins/connectiq/event-args/log-event-args";
import { DebugDevices, environment } from "../../../environments/environment";
import { StringUtils } from "../../classes/utils/string-utils";
import { SelectGarminDevice } from "../../pages/devices/devices.page";
import ConnectIQ from "../../plugins/connectiq/connect-iq";
import { ConnectIQDeviceMessage } from "../../plugins/connectiq/event-args/connect-iq-device-message.";
import { DeviceEventArgs } from "../../plugins/connectiq/event-args/device-event-args";
import { ConfigService } from "../config/config.service";
import { Locale } from "../localization/locale";
import { LocalizationService } from "../localization/localization.service";
import { PopupsService } from "../popups/popups.service";
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
    private _watchOutdatedNotice: number[] = [];

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

    private readonly Preferences = inject(PreferencesService);
    private readonly Config = inject(ConfigService);
    private readonly Router = inject(Router);
    private readonly Popup = inject(PopupsService);
    private readonly Locale = inject(LocalizationService);

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
                        Logger.Debug("Device state changed: ", device);
                        this._devices.find(d => d.Identifier == device.id)?.Update(device);
                        this.onDeviceChangedSubject.next(ConnectIQDevice.FromEventArgs(device, this));
                        this.checkDeviceVersion(device);
                    }
                });
            }
            if (!this._receiverListener) {
                this._receiverListener = await this.addListener<DeviceMessageEventArgs>("RECEIVE", async obj => {
                    if (obj) {
                        const message = new ConnectIQDeviceMessage(obj, this);
                        Logger.Debug(`Received message with ${StringUtils.toString(message.Message).length} bytes from device: `, message.Device.toString());
                        if ((await this.handleResponse(message)) == false) {
                            this.onMessageReceivedSubject.next({ device: ConnectIQDevice.FromEventArgs(obj.device, this), message: message });
                        }
                    }
                });
            }
            this._devices = [];
            this.isDebugMode = debug_devices;
            await ConnectIQ.Initialize({ live_devices: !debug_devices, live_app: environment.publicRelease });

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
     * Returns the most probable device, or let the user select one, if the device is uncertain
     * @returns device object
     */
    public async GetDefaultDevice(args?: { btn_text?: string }): Promise<ConnectIQDevice | undefined> {
        if (this._alwaysTransmitToDevice && Capacitor.isNativePlatform()) {
            return this._alwaysTransmitToDevice;
        } else {
            const online = this._devices.filter(d => d.State == "Ready");
            if (online.length == 1) {
                return online[0];
            } else {
                return new Promise<ConnectIQDevice | undefined>(resolve => {
                    SelectGarminDevice({ router: this.Router, callback: async (device?: ConnectIQDevice) => resolve(device), submitRoute: undefined, buttonText: args?.btn_text });
                });
            }
        }
    }

    /**
     * opens the playstore
     */
    public async openStore() {
        //await ConnectIQ.OpenStore();
        await Browser.open({ url: `https://apps.garmin.com/${Locale.currentLang().locale}/apps/${this.Config.GarminAppStoreId}` });
    }

    /**
     * opens the app on the watch
     */
    public async openApp(device: ConnectIQDevice): Promise<void> {
        await ConnectIQ.OpenApp({ device_id: String(device.Identifier) });
    }

    public async SendToDevice(obj: { device?: ConnectIQDevice | number; data: any; response?: (message?: ConnectIQDeviceMessage) => Promise<void>; timeout?: number }): Promise<number | boolean> {
        if (typeof obj.device === "number") {
            obj.device = await this.GetDevice(obj.device);
        } else if (!obj.device) {
            obj.device = await this.GetDefaultDevice();
        }

        if (!obj.device) {
            Logger.Debug(`Could not send data to device: no device found`);
            return false;
        }

        let tid: number | undefined = undefined;
        if (obj.response) {
            tid = this.addResponseListener(obj.response, obj.timeout);
            obj.data.tid = tid;
        }

        if ((await ConnectIQ.SendToDevice({ device_id: String(obj.device.Identifier), json: JSON.stringify(obj.data) })).success) {
            return tid ?? true;
        } else {
            return false;
        }
    }

    public CancelRequest(tid: number) {
        this._pendingResponses = this._pendingResponses.filter(l => l.id != tid);
        if (this._pendingResponsesTimoutCheck && this._pendingResponses.length === 0) {
            this._pendingResponsesTimoutCheck.unsubscribe();
            this._pendingResponsesTimoutCheck = undefined;
        }
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
                    Logger.Debug(`Received watch response for request ${tid} after ${Date.now() - pending.started} ms`);
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

    private async checkDeviceVersion(device: DeviceEventArgs) {
        if (device.state == "Ready" && !this.isDebugMode && !this._watchOutdatedNotice.includes(device.id)) {
            this._watchOutdatedNotice.push(device.id);
            type ignore_device = { device: number; version: number; check: number };
            let all_ignore = await this.Preferences.Get<ignore_device[] | undefined>(EPrefProperty.IgnoreWatchOutdated, undefined);
            if (!device.version || device.version < this.Config.GarminAppVersion) {
                if (!Array.isArray(all_ignore)) {
                    all_ignore = [];
                }
                all_ignore = all_ignore.filter(d => d.device != device.id && d.check > Date.now() - 1000 * 60 * 60 * 24 * 180);
                const ignore = all_ignore.find(d => d.device == device.id);
                if (!ignore || ignore.version < this.Config.GarminAppVersion) {
                    Logger.Notice(`Old lists app found on device ${StringUtils.toString(device)}, up-to-date version is ${this.Config.GarminAppVersion}`);
                    const res = await this.Popup.Alert.Show({
                        message: this.Locale.getText("service-connectiq.watch_outdated", { device: device.name }),
                        buttons: [
                            this.Locale.getText("service-connectiq.watch_outdated_ignore"),
                            {
                                text: this.Locale.getText("service-connectiq.watch_outdated_button"),
                                handler: () => this.openStore(),
                                role: "confirm",
                            },
                        ],
                        inputs: [
                            {
                                type: "checkbox",
                                label: this.Locale.getText("service-connectiq.watch_outdated_dontremind"),
                                value: "ignore",
                                checked: ignore != undefined,
                            },
                        ],
                    });
                    if (Array.isArray(res) && res.includes("ignore")) {
                        if (ignore) {
                            all_ignore?.forEach(d => {
                                if (d.device == device.id) {
                                    d.version = this.Config.GarminAppVersion;
                                    d.check = Date.now();
                                }
                            });
                        } else {
                            all_ignore.push({ device: device.id, version: this.Config.GarminAppVersion, check: Date.now() });
                        }
                    } else {
                        all_ignore = undefined;
                    }
                }
            }
            if (all_ignore && all_ignore.length > 0) {
                await this.Preferences.Set(EPrefProperty.IgnoreWatchOutdated, all_ignore);
            } else {
                await this.Preferences.Remove(EPrefProperty.IgnoreWatchOutdated);
            }
        }
    }
}

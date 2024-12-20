import { Capacitor, PluginListenerHandle } from "@capacitor/core";
import { ConnectIQService } from "../../../services/connectiq/connect-iq.service";
import { Logger } from "../../../services/logging/logger";
import ConnectIQ from "../connect-iq";

export abstract class ConnectIQListener<T> {
    private _connectiqListener?: PluginListenerHandle;
    protected _service: ConnectIQService;

    constructor(service: ConnectIQService) {
        this._service = service;
    }

    /**
     * adds the plugin event listener
     */
    public async addListener() {
        if (Capacitor.isNativePlatform()) {
            this._connectiqListener = await ConnectIQ.addListener<T>(this.Event(), async (data: T) => {
                if ((await this.Callback(data)) == false) {
                    this.CallbackFailed();
                }
            });
        }
    }

    /**
     * remove the plugin event listener
     */
    public async clearListener() {
        if (this._connectiqListener) {
            await this._connectiqListener.remove();
            this._connectiqListener = undefined;
        }
    }

    /**
     * returns the messge event, the class is listening to
     */
    public abstract Event(): string;

    protected abstract Callback(data: T): Promise<boolean>;

    protected CallbackFailed() {
        Logger.Error(`Processing data for message ${this.Event()} failed`);
    }
}

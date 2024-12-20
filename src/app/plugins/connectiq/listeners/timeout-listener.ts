import { ConnectIQService } from "../../../services/connectiq/connect-iq.service";
import { ConnectIQListener } from "./connect-iq-listener";

export abstract class TimeoutListener<T> extends ConnectIQListener<T> {
    private readonly DEFAULT_TIMEOUT = 10;

    protected _started?: number;
    protected _timeout: number;

    constructor(service: ConnectIQService, timeout?: number) {
        super(service);
        this._timeout = timeout ?? this.DEFAULT_TIMEOUT;
    }

    public IsTimedOut(): boolean {
        return this._started != undefined && this._started < Date.now() - this._timeout * 1000;
    }

    public override async addListener(): Promise<void> {
        await super.addListener();
        this._started = Date.now();
    }
}

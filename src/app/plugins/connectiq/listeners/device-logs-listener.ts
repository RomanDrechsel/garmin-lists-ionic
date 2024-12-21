import { Logger } from "../../../services/logging/logger";
import { LogEventArgs } from "../event-args/log-event-args";
import { ConnectIQListener } from "./connect-iq-listener";

export class DeviceLogsListener extends ConnectIQListener<LogEventArgs> {
    public Event(): string {
        return "LOG";
    }

    protected async Callback(log: LogEventArgs): Promise<void> {
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
    }
}

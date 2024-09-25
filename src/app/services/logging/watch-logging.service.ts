import { inject, Injectable } from "@angular/core";
import { ConnectIQService } from "../connectiq/connect-iq.service";

@Injectable({
    providedIn: "root",
})
export class WatchLoggingService {
    public ConnectIQ = inject(ConnectIQService);

    /**
     * returns logs of the garmin watch
     * @returns logs as string array, or undefined if something goes wrong
     */
    public async RequestGarminWatchLogs(uuid?: string | number): Promise<String[] | undefined> {
        if (typeof uuid === "string") {
            try {
                uuid = Number(uuid);
            } catch {
                return undefined;
            }
        }
        return new Promise<String[] | undefined>(async resolve => {
            if (
                (await this.ConnectIQ.SendToDevice({
                    device: Number(uuid),
                    data: { type: "request", request: "logs" },
                    response: async message => {
                        if (message?.Message && message.Message.logs) {
                            if (message.Message.logs instanceof Array) {
                                resolve(message.Message.logs as String[]);
                                return;
                            }
                        }
                        resolve(undefined);
                    },
                    timeout: 30,
                })) == false
            ) {
                resolve(undefined);
            }
        });
    }
}

import { ConnectIQDeviceMessage } from "../../plugins/connectiq/event-args/connect-iq-device-message.";

export type ConnectIQResponseListener = {
    id: number;
    started: number;
    timeout: number;
    callback: (message?: ConnectIQDeviceMessage) => Promise<void>;
};

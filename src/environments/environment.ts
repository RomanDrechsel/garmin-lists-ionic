// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { ConnectIQDevice } from "../app/services/connectiq/connect-iq-device";
import { ConnectIQService } from "../app/services/connectiq/connect-iq.service";

export const environment = {
    production: false
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

export const DebugDevices = function (service: ConnectIQService): ConnectIQDevice[] {
    return [
        ConnectIQDevice.FromEventArgs({ id: 123456789, name: "Webdummy No App", state: "AppNotInstalled" }, service),
        ConnectIQDevice.FromEventArgs({ id: 234567890, name: "Webdummy", state: "Ready" }, service),
        ConnectIQDevice.FromEventArgs({ id: 345678901, name: "Webdummy Invalid State", state: "InvalidState" }, service),
    ];
};

import { HttpClient } from "@angular/common/http";
import { Injectable } from '@angular/core';
import { firstValueFrom } from "rxjs";
import { Logger } from "../logging/logger";

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private _config: { [key: string]: any; } = {};

    constructor(http: HttpClient) {
        this.Initialize(http);
    }

    /** initialize serice */
    public async Initialize(http: HttpClient) {
        try {
            this._config = await firstValueFrom(http.get('/config.json'));
        }
        catch (error) {
            Logger.Error("Could not read config.json", error);
        }
    }

    /**
     * get the config array
     */
    public get Config(): { [key: string]: any; } {
        return this._config;
    }

    /**
     * get the build number from config
     */
    public get Build(): number {
        return this._config["build"] ?? -1;
    }

    /**
     * get the version string from config
     */
    public get VersionString(): string {
        return this._config["version"] ?? "";
    }

    /**
     * get the bundleId from config
     */
    public get BundleId(): string {
        return this._config["bundleId"] ?? "de.romandrechsel.lists";
    }

    /**
     * my e-mail address, to send error logs to...
     */
    public get MyEmail(): string {
        return this._config["myemail"] ?? "";
    }
}

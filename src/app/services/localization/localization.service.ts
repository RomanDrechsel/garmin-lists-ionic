import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { Logger } from "../logging/logger";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class LocalizationService {
    /** fallback language if the requested language doesn't exist  */
    private readonly fallbackLang = "en";
    /** current app language */
    public currentLang: string = "";

    /** all available languages */
    public readonly availableLangsDetails: { short: string; long: string; }[] = [
        { short: "de", long: "Deutsch" },
        { short: "en", long: "English" },
    ];

    /** get all available short languages */
    private get availableLangs(): string[] {
        let ret: string[] = [];
        this.availableLangsDetails.forEach(l => {
            ret.push(l.short);
        });
        return ret;
    }

    constructor(public translate: TranslateService, private Preferences: PreferencesService) {
        this.translate.addLangs(this.availableLangs);
        this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
            if (event.lang != this.currentLang && this.availableLangs.indexOf(event.lang) >= 0) {
                this.Preferences.Set(EPrefProperty.AppLanguage, event.lang);
                Logger.Debug(`Changed language to ${event.lang}`);
                this.currentLang = event.lang;
            }
        });

        let lang = this.translate.getBrowserLang();
        if (!lang || this.availableLangs.indexOf(lang) < 0) {
            lang = this.fallbackLang;
        }
        this.translate.setDefaultLang(lang);
    }

    /**
     * initialize service
     */
    public async Initialize() {
        let lang: string | undefined = await this.Preferences.Get<string>(EPrefProperty.AppLanguage, "");
        if (lang.length == 0) {
            if (Capacitor.isNativePlatform()) {
                const res = await Device.getLanguageCode();
                lang = res.value;
                Logger.Debug(`Device language is ${lang}`);
            }
            else {
                lang = this.translate.getBrowserLang();
                Logger.Debug(`Browser language is ${lang}`);
            }
        }
        else {
            Logger.Debug(`User language is ${lang}`);
        }

        if (!lang || this.availableLangs.indexOf(lang) < 0) {
            lang = this.fallbackLang;
        }

        this.ChangeLanguage(lang);
    }

    /**
     * change the current app language
     * @param lang new language
     */
    public async ChangeLanguage(lang: string) {
        if (this.currentLang != lang) {
            if (this.availableLangs.indexOf(lang) >= 0) {
                await firstValueFrom(this.translate.use(lang));
            } else {
                Logger.Important(`Not supported language ${lang}, staying with ${this.currentLang}`);
            }
        }
    }

    /**
     * get one or more text parts
     * @param keys key or keys, which should be fetched
     * @param params placeholder to me replaced in text
     * @returns string or array of string from localization
     */
    public getText(keys: string | string[], params: Object | undefined = undefined): any {
        return this.translate.instant(keys, params);
    }
}

import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { Logger } from "../logging/logger";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class LocalizationService {
    /** fallback language if the requested language doesn't exist  */
    public readonly fallbackLang: Culture = {
        localeFile: "en", locale: "en-US", name: "English (US)", firstDayOfWeek: 0
    };

    /** current app language */
    private currentLang: Culture = this.fallbackLang;

    /** all available languages */
    public get availableTranslations(): Culture[] {
        return [
            this.fallbackLang,
            { localeFile: "en", locale: "en-GB", name: "English (UK)", firstDayOfWeek: 1 },
            { localeFile: "de", locale: "de-DE", name: "Deutsch", firstDayOfWeek: 1 },
        ];
    };

    constructor(public translate: TranslateService, private Preferences: PreferencesService) {
        const avail = this.availableTranslations;
        this.translate.addLangs([...new Set<string>(avail.map(l => l.localeFile))]);
        this.translate.setDefaultLang(this.fallbackLang.localeFile);
    }

    public get CurrentLanguage(): Culture {
        return this.currentLang;
    }

    /**
     * initialize service
     */
    public async Initialize() {
        let lang: string | undefined = await this.Preferences.Get<string>(EPrefProperty.AppLanguage, "");
        if (lang.length == 0) {
            if (Capacitor.isNativePlatform()) {
                lang = (await Device.getLanguageTag()).value;
                Logger.Debug(`Device language is ${lang}`);
            }
            else {
                lang = this.translate.getBrowserCultureLang();
                Logger.Debug(`Browser language is ${lang}`);
            }
        }
        else {
            Logger.Debug(`User language is ${lang}`);
        }

        if (!lang || !this.availableTranslations.some(l => l.locale == lang)) {
            lang = this.fallbackLang.locale;
        }

        this.ChangeLanguage(lang);
    }

    /**
     * change the current app language
     * @param culture new language
     */
    public async ChangeLanguage(locale: string) {
        const culture = this.availableTranslations.find(l => l.locale == locale);
        if (!culture) {
            Logger.Important(`Not supported language ${locale}, staying with ${this.currentLang.locale}`);
            return;
        }

        if (this.currentLang.locale != culture.locale) {
            if (this.currentLang.localeFile != culture.localeFile) {
                await firstValueFrom(this.translate.use(culture.localeFile));
            }
            this.currentLang = culture;
            this.Preferences.Set(EPrefProperty.AppLanguage, this.currentLang.locale);
            Logger.Debug(`Changed language to ${this.currentLang.locale}`);
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

export declare type Culture = {
    localeFile: string,
    locale: string,
    name: string,
    firstDayOfWeek: number,
};

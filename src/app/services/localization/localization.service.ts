import { inject, Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { AppService } from "../app/app.service";
import { ConfigService } from "../config/config.service";
import { Logger } from "../logging/logger";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class LocalizationService {
    /** fallback language if the requested language doesn't exist  */
    private readonly _fallbackLang = new Culture({
        localeFile: "en",
        locale: "en-US",
        name: "English (US)",
        firstDayOfWeek: 1,
        h24: false,
        locale_regex: /^(en-[^-GB]*)$/i,
    });

    /** current app language */
    private _currentCulture: Culture = this._fallbackLang;
    private _currentLocale: string = this._fallbackLang.locale;

    public readonly Translate = inject(TranslateService);
    private readonly Preferences = inject(PreferencesService);
    private readonly Config = inject(ConfigService);

    constructor() {
        this.Translate.addLangs([...new Set<string>(this.availableTranslations.map(l => l.localeFile))]);
        this.Translate.setDefaultLang(this._fallbackLang.localeFile);
    }

    /** all available languages */
    public get availableTranslations(): Culture[] {
        return [
            this._fallbackLang,
            new Culture({ localeFile: "en", locale: "en-GB", name: "English (UK)", firstDayOfWeek: 2, h24: true }),
            new Culture({ localeFile: "de", locale: "de-DE", name: "Deutsch", firstDayOfWeek: 2, h24: true, locale_regex: /^de[-_][0-9A-Za-z]{2,}$/i }),
            new Culture({ localeFile: "es", locale: "es-ES", name: "Español", firstDayOfWeek: 2, h24: true, locale_regex: /^es[-_][0-9A-Za-z]{2,}$/i }),
            new Culture({ localeFile: "fr", locale: "fr-FR", name: "Français", firstDayOfWeek: 2, h24: true, locale_regex: /^fr[-_][0-9A-Za-z]{2,}$/i }),
            new Culture({ localeFile: "jp", locale: "ja-JP", name: "日本語", firstDayOfWeek: 2, h24: true, locale_regex: /^ja[-_][0-9A-Za-z]{2,}$/i }),
            new Culture({ localeFile: "uk", locale: "uk-UA", name: "Українська", firstDayOfWeek: 2, h24: true, locale_regex: /^uk[-_][0-9A-Za-z]{2,}$/i }),
            new Culture({ localeFile: "zhs", locale: "zh-CN", name: "中文 (简体)", firstDayOfWeek: 1, h24: true, locale_regex: /^(zh-CN|zh-SG|zh-MY)$/i }),
            new Culture({ localeFile: "zht", locale: "zh-TW", name: "中文 (繁體)", firstDayOfWeek: 2, h24: false, locale_regex: /^(zh-TW|zh-HK|zh-MO)$/i }),
        ];
    }

    /**
     * returns the current cuture for the loaded locale
     */
    public get CurrentLanguage(): Culture {
        return this._currentCulture;
    }

    /**
     * initialize service
     */
    public async Initialize() {
        let lang: string | Culture | undefined = await this.Preferences.Get<string>(EPrefProperty.AppLanguage, "");
        if (lang.length == 0) {
            if (Capacitor.isNativePlatform()) {
                lang = (await Device.getLanguageTag()).value;
                Logger.Debug(`Device language is ${lang}`);
            } else {
                lang = this.Translate.getBrowserCultureLang();
                Logger.Debug(`Browser language is ${lang}`);
            }
        } else {
            Logger.Debug(`User language is ${lang}`);
        }

        if (!lang || !this.availableTranslations.some(l => l.Match(String(lang)))) {
            lang = this._fallbackLang;
        }

        this.ChangeLanguage(lang, true);
    }

    /**
     * change the current app language
     * @param culture new language
     */
    public async ChangeLanguage(locale: string | Culture | undefined, init: boolean = false) {
        let culture: Culture | undefined = undefined;
        if (locale instanceof Culture) {
            culture = locale;
        } else if (typeof locale == "string") {
            culture = this.availableTranslations.find(l => l.Match(String(locale)));
        }
        if (!culture) {
            Logger.Important(`Not supported language ${locale}, staying with ${this._currentLocale}`);
            return;
        }

        locale = typeof locale == "string" ? locale : culture.locale;
        if (locale != this._currentLocale) {
            this._currentLocale = locale;

            if (!this._currentCulture.Match(this._currentLocale)) {
                if (this._currentCulture.localeFile != culture.localeFile) {
                    await firstValueFrom(this.Translate.use(culture.localeFile));
                }
                this._currentCulture = culture;
            }
            await this.Preferences.Set(EPrefProperty.AppLanguage, this._currentLocale);
            Logger.Debug(`Changed language to ${this._currentCulture.name} (${this._currentLocale})`);
            this.WarnForTranslation(!init);
        }
    }

    /**
     * get one or more text parts
     * @param keys key or keys, which should be fetched
     * @param params placeholder to me replaced in text
     * @returns string or array of string from localization
     */
    public getText(keys: string | string[], params: Object | undefined = undefined): any {
        return this.Translate.instant(keys, params);
    }

    /**
     * display an alert, if an ai translation is used
     */
    public async WarnForTranslation(force: boolean = true) {
        if (["de", "en"].indexOf(this.CurrentLanguage.localeFile) < 0) {
            if (force || (await this.Preferences.Get(EPrefProperty.FirstStart, true)) == true) {
                await AppService.Popups.Alert.Show({
                    message: this.getText("page_settings.language_hint", { email: this.Config.EMailAddress }),
                });
            }
        }
        console.log(await this.Preferences.Get(EPrefProperty.FirstStart, true));
    }
}

export class Culture {
    public localeFile!: string;
    public locale!: string;
    public locale_regex?: RegExp;
    public name!: string;
    public firstDayOfWeek!: number;
    public h24!: boolean;

    public constructor(obj: { localeFile: string; locale: string; locale_regex?: RegExp; name: string; firstDayOfWeek: number; h24: boolean }) {
        this.localeFile = obj.localeFile;
        this.locale = obj.locale;
        this.locale_regex = obj.locale_regex;
        this.name = obj.name;
        this.firstDayOfWeek = obj.firstDayOfWeek;
        this.h24 = obj.h24;
    }

    public Match(locale: string): boolean {
        return this.locale == locale || (this.locale_regex ? this.locale_regex.test(locale) : false);
    }
}

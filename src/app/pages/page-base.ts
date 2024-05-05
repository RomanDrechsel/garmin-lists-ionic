import { ChangeDetectorRef, inject } from "@angular/core";
import { AppComponent } from "../app.component";
import { MenuItem } from "../classes/menu-items";
import { ConnectIQService } from "../services/connectiq/connect-iq.service";
import { ListsService } from "../services/lists/lists.service";
import { LocalizationService } from "../services/localization/localization.service";
import { LoggingService } from "../services/logging/logging.service";
import { PopupsService } from "../services/popups/popups.service";
import { ConfigService } from "../services/storage/config.service";
import { PreferencesService } from "../services/storage/preferences.service";

export abstract class PageBase {
    protected appComponent: AppComponent;
    protected Popups: PopupsService;
    protected Config: ConfigService;
    protected ConnectIQ: ConnectIQService;
    protected ListsService: ListsService;
    protected Locale: LocalizationService;
    protected Logger: LoggingService;
    protected Preferences: PreferencesService;
    protected cdr: ChangeDetectorRef;

    constructor() {
        this.appComponent = inject(AppComponent);
        this.Popups = inject(PopupsService);
        this.Config = inject(ConfigService);
        this.ConnectIQ = inject(ConnectIQService);
        this.ListsService = inject(ListsService);
        this.Locale = inject(LocalizationService);
        this.Logger = inject(LoggingService);
        this.Preferences = inject(PreferencesService);
        this.cdr = inject(ChangeDetectorRef);
    }

    public async ionViewWillEnter() {
        this.Popups.Loading.Hide();
    }

    public async ionViewDidEnter() {
        this.appComponent.setAppPages(this.ModifyMainMenu());
    }

    public async ionViewWillLeave() { }

    public async ionViewDidLeave() { }

    public ModifyMainMenu(): MenuItem[] {
        return [];
    }
}

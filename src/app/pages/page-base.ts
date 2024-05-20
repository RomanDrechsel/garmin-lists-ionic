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
    protected appComponent = inject(AppComponent);
    protected Popups = inject(PopupsService);
    protected Config = inject(ConfigService);
    protected ConnectIQ = inject(ConnectIQService);
    protected ListsService = inject(ListsService);
    protected Locale = inject(LocalizationService);
    protected Logger = inject(LoggingService);
    protected Preferences = inject(PreferencesService);
    protected cdr = inject(ChangeDetectorRef);

    public async ionViewWillEnter() {
        this.Popups.Loading.Hide();
    }

    public async ionViewDidEnter() {
        this.appComponent.setAppPages(this.ModifyMainMenu());
    }

    public async ionViewWillLeave() {}

    public async ionViewDidLeave() {}

    public ModifyMainMenu(): MenuItem[] {
        return [];
    }
}

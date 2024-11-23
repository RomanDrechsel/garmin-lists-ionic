import { ChangeDetectorRef, Component, ViewChild, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";
import { AppComponent } from "../app.component";
import { MenuItem } from "../classes/menu-items";
import { MainToolbarComponent } from "../components/main-toolbar/main-toolbar.component";
import { AppService } from "../services/app/app.service";
import { ConfigService } from "../services/config/config.service";
import { ConnectIQService } from "../services/connectiq/connect-iq.service";
import { ListsService } from "../services/lists/lists.service";
import { LocalizationService } from "../services/localization/localization.service";
import { LoggingService } from "../services/logging/logging.service";
import { PopupsService } from "../services/popups/popups.service";
import { PreferencesService } from "../services/storage/preferences.service";

@Component({
    template: "",
    standalone: false
})
export abstract class PageBase {
    @ViewChild(MainToolbarComponent) protected Toolbar?: MainToolbarComponent;

    protected readonly appComponent = inject(AppComponent);
    protected readonly Popups = inject(PopupsService);
    protected readonly ConnectIQ = inject(ConnectIQService);
    protected readonly ListsService = inject(ListsService);
    protected readonly Locale = inject(LocalizationService);
    protected readonly Logger = inject(LoggingService);
    protected readonly Preferences = inject(PreferencesService);
    protected readonly NavController = inject(NavController);
    protected readonly AppService = inject(AppService);
    protected readonly Config = inject(ConfigService);
    protected readonly cdr = inject(ChangeDetectorRef);

    public async ionViewWillEnter() {
        this.Popups.Loading.Hide();
    }

    public async ionViewDidEnter() {
        this.appComponent.setAppPages(this.ModifyMainMenu());
        AppService.AppToolbar = this.Toolbar;
    }

    public async ionViewWillLeave() {}

    public async ionViewDidLeave() {}

    public ModifyMainMenu(): MenuItem[] {
        return [];
    }
}

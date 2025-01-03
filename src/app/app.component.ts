import { CommonModule } from "@angular/common";
import { Component, OnInit, ViewChild, inject, isDevMode } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { App } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";
import { IonApp, IonContent, IonFooter, IonIcon, IonImg, IonItem, IonLabel, IonList, IonMenu, IonRouterOutlet, IonSplitPane, IonToggle, NavController, Platform } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { EMenuItemType, MenuItem, MenuitemFactory, MenuitemFactoryList } from "./classes/menu-items";
import { AppService } from "./services/app/app.service";
import { ConnectIQService } from "./services/connectiq/connect-iq.service";
import { EPrefProperty, PreferencesService } from "./services/storage/preferences.service";

@Component({
    selector: "app-root",
    templateUrl: "app.component.html",
    styleUrls: ["app.component.scss"],
    imports: [IonToggle, IonFooter, IonImg, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, IonLabel, IonRouterOutlet, TranslateModule, RouterLink, RouterLinkActive, CommonModule],
})
export class AppComponent implements OnInit {
    public appPages: MenuItem[] = [];
    public systemPages: MenuItem[] = MenuitemFactoryList([EMenuItemType.Settings, EMenuItemType.AppInfo, EMenuItemType.Privacy]);
    private useTrash: boolean = true;

    public readonly ConnectIQ = inject(ConnectIQService);
    private readonly Platform = inject(Platform);
    private readonly Preferences = inject(PreferencesService);
    private readonly App = inject(AppService);
    private readonly NavController = inject(NavController);

    @ViewChild("router_outlet") private routerOutlet!: IonRouterOutlet;

    @ViewChild("mainMenu") private MainMenu!: IonMenu;

    public get isDevMode(): boolean {
        return isDevMode();
    }

    public get menuSide() {
        return this.App.DeviceWidth < 1024 ? "end" : "start";
    }

    public async ngOnInit() {
        if (AppService.isMobileApp) {
            StatusBar.setBackgroundColor({ color: "#333745" });
        }

        //exit app if back-stack is empty
        this.Platform.backButton.subscribeWithPriority(-1, async () => {
            await this.tapBackToExit();
        });

        this.Preferences.onPrefChanged$.subscribe(prop => {
            if (prop.prop == EPrefProperty.TrashLists) {
                this.useTrash = prop.value as boolean;
                this.setAppPages();
            }
        });
        this.useTrash = await this.Preferences.Get<boolean>(EPrefProperty.TrashLists, true);
        this.setAppPages();
    }

    public async onMenuItemClick(item: MenuItem) {
        let close = true;
        if (item.onClick) {
            close = await item.onClick();
        }
        if (close) {
            this.MainMenu?.close();
        }
    }

    public onGarminSimulator(checked: boolean) {
        this.ConnectIQ.AlwaysTransmitToDevice = undefined;
        this.Preferences.Set(EPrefProperty.DebugSimulator, checked);
        this.ConnectIQ.Initialize({ simulator: checked });
    }

    public onGarminDebugApp(checked: boolean) {
        this.ConnectIQ.AlwaysTransmitToDevice = undefined;
        this.Preferences.Set(EPrefProperty.DebugApp, checked);
        this.ConnectIQ.Initialize({ debug_app: checked });
    }

    public setAppPages(menu: MenuItem[] = []) {
        let required = MenuitemFactoryList([EMenuItemType.Lists, EMenuItemType.Devices]);
        required.push(MenuitemFactory(EMenuItemType.ListsTrash, { disabled: !this.useTrash }));
        for (let i = required.length - 1; i >= 0; i--) {
            if (!menu?.find(m => m.Id == required[i].Id)) {
                menu?.unshift(required[i]);
            }
        }
        menu = menu.filter(m => m.Hidden !== true);
        this.appPages = menu;
    }

    private async tapBackToExit() {
        if (this.routerOutlet) {
            if (!this.routerOutlet.canGoBack()) {
                const backlink = AppService.AppToolbar?.BackLink;
                if (backlink) {
                    this.NavController.navigateBack(backlink);
                } else {
                    await App.minimizeApp();
                }
            }
        }
    }
}

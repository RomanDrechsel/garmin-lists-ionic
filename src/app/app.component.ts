import { CommonModule } from "@angular/common";
import { Component, OnInit, ViewChild, inject, isDevMode } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { App } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";
import { IonApp, IonContent, IonFooter, IonIcon, IonImg, IonItem, IonLabel, IonList, IonMenu, IonNote, IonRouterOutlet, IonSplitPane, IonToggle, Platform } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MenuItem, MenuItemAppInfos, MenuItemDevices, MenuItemLists, MenuItemListsTrash, MenuItemSettings } from "./classes/menu-items";
import { AdmobService } from "./services/adverticing/admob.service";
import { AppService } from "./services/app/app.service";
import { ConnectIQService } from "./services/connectiq/connect-iq.service";
import { EPrefProperty, PreferencesService } from "./services/storage/preferences.service";

@Component({
    selector: "app-root",
    templateUrl: "app.component.html",
    styleUrls: ["app.component.scss"],
    standalone: true,
    imports: [
        IonToggle,
        IonFooter,
        IonImg,
        IonApp,
        IonSplitPane,
        IonMenu,
        IonContent,
        IonList,
        IonNote,
        IonItem,
        IonIcon,
        IonLabel,
        IonRouterOutlet,
        TranslateModule,
        RouterLink,
        RouterLinkActive,
        CommonModule,
    ],
})
export class AppComponent implements OnInit {
    public appPages: MenuItem[] = [];
    public systemPages: MenuItem[] = [];

    public readonly ConnectIQ = inject(ConnectIQService);
    private readonly Platform = inject(Platform);
    private readonly Preferences = inject(PreferencesService);
    private readonly App = inject(AppService);
    private readonly Admob = inject(AdmobService);

    @ViewChild("router_outlet") private routerOutlet!: IonRouterOutlet;

    @ViewChild("mainMenu") private MainMenu!: IonMenu;

    constructor() {
        this.setAppPages();
        this.systemPages = [MenuItemSettings(), MenuItemAppInfos()];
    }

    public get isDevMode(): boolean {
        return isDevMode();
    }

    public async ngOnInit() {
        if (AppService.isMobileApp) {
            StatusBar.setBackgroundColor({ color: "#333745" });
        }

        //exit app if back-stack is empty
        this.Platform.backButton.subscribeWithPriority(-1, () => {
            if (this.routerOutlet) {
                if (!this.routerOutlet.canGoBack()) {
                    App.exitApp();
                }
            }
        });

        //this.Admob.ShowBanner();
    }

    public get menuSide() {
        return this.App.DeviceWidth < 1024 ? "end" : "start";
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

    public onDebugDevices(checked: boolean) {
        this.ConnectIQ.AlwaysTransmitToDevice = undefined;
        this.ConnectIQ.Initialize(checked);
        this.Preferences.Set(EPrefProperty.DebugDevices, checked);
    }

    public setAppPages(menu: MenuItem[] = []) {
        const required = [MenuItemLists(), MenuItemDevices(), MenuItemListsTrash()];
        for (let i = required.length - 1; i >= 0; i--) {
            if (!menu?.find(m => m.Id == required[i].Id)) {
                menu?.unshift(required[i]);
            }
        }

        menu = menu.filter(m => !m.Hide);

        this.appPages = menu;
    }
}

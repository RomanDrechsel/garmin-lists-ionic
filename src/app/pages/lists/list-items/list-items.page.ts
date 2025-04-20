import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonButton, IonCheckbox, IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonNote, IonReorder, IonReorderGroup, IonText, IonTextarea, ItemReorderEventDetail } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import type { EditMenuAction } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
import { MainToolbarListsCustomMenuComponent } from "src/app/components/main-toolbar-lists-custom-menu/main-toolbar-lists-custom-menu.component";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { EMenuItemType, MenuItem, MenuitemFactory } from "../../../classes/menu-items";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { Listitem } from "../../../services/lists/listitem";
import { Locale } from "../../../services/localization/locale";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { AnimatedListPageBase } from "../animated-list-page-base";

@Component({
    selector: "app-list-items",
    templateUrl: "./list-items.page.html",
    styleUrls: ["./list-items.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        IonLabel,
        IonCheckbox,
        IonImg,
        IonText,
        IonButton,
        IonTextarea,
        IonFabButton,
        IonFab,
        IonReorder,
        IonNote,
        IonItem,
        IonItemOptions,
        IonItemSliding,
        IonIcon,
        IonItemOption,
        IonReorderGroup,
        IonList,
        IonContent,
        CommonModule,
        FormsModule,
        TranslateModule,
        MainToolbarComponent,
        PageAddNewComponent,
        PageEmptyComponent,
        MainToolbarListsCustomMenuComponent,
    ],
})
export class ListItemsPage extends AnimatedListPageBase {
    @ViewChild("quickAdd", { read: IonTextarea, static: false }) private quickAdd?: IonTextarea;
    private _list?: List = undefined;

    private _listSubscription?: Subscription;
    private _connectIQSubscription?: Subscription;

    private _useTrash = true;
    private _listTitle?: string = undefined;
    private _informedSyncForNewlist: string | number | undefined = undefined;
    private _preferencesSubscription?: Subscription;

    private readonly Route = inject(ActivatedRoute);

    public get List(): List | undefined {
        return this._list;
    }

    public get PageTitle(): string {
        if (!this._list) {
            if (this._listTitle?.length) {
                return this._listTitle;
            } else {
                return Locale.getText("page_listitems.loading");
            }
        } else {
            return this._list.Name;
        }
    }

    constructor() {
        super();
        this._animationDirection = "top";
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._itemsInitialized = false;
        const listtitle = this.Route.snapshot.queryParamMap.get("title");
        if (listtitle) {
            this._listTitle = listtitle;
        }

        (async () => {
            // no wait
            const listid = this.Route.snapshot.paramMap.get("uuid");
            if (listid) {
                const uuid = Number(listid);
                this._list = await this.ListsService.GetList(!Number.isNaN(uuid) ? uuid : listid);
                this._itemsInitialized = true;
                this.onItemsChanged();
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        })();
        this._useTrash = await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true);
        this._preferencesSubscription = this.Preferences.onPrefChanged$.subscribe(prop => {
            if (prop.prop == EPrefProperty.TrashListitems) {
                this._useTrash = prop.value as boolean;
            }
        });

        this._listSubscription = this.ListsService.onListChanged$.subscribe(async list => {
            if (list && list.equals(this._list) && list.isPeek == false) {
                this._list = list;
                this.appComponent.setAppPages(this.ModifyMainMenu());
                this._itemsInitialized = true;
                this.onItemsChanged();
            }
        });

        this._connectIQSubscription = this.ConnectIQ.onInitialized$.subscribe(async () => {
            this.appComponent.setAppPages(this.ModifyMainMenu());
        });

        if (this.List && this.List.Sync && this._informedSyncForNewlist != this.List.Uuid && (await this.Preferences.Get(EPrefProperty.SyncListOnDevice, false)) == false) {
            const new_created = this.Route.snapshot.queryParamMap.get("created");
            if (new_created) {
                this._informedSyncForNewlist = this.List.Uuid;
                await this.informSyncSettings();
            }
        }
    }

    public override async ionViewDidEnter() {
        await super.ionViewDidEnter();
        if (this.List) {
            await this.Preferences.Set(EPrefProperty.OpenedList, this.List.Uuid);
        }
    }

    public override async ionViewWillLeave() {
        await super.ionViewWillLeave();
        await this.Preferences.Remove(EPrefProperty.OpenedList);
        this._preferencesSubscription?.unsubscribe();
        this._listSubscription?.unsubscribe();
        this._connectIQSubscription?.unsubscribe();
    }

    public onSwipeRight(item: Listitem) {
        this.deleteItem(item);
    }

    public onSwipeLeft(item: Listitem) {
        this.HideItem(item);
    }

    public editItem(item: Listitem) {
        if (this.List && !this._disableClick && this._initAnimationDone) {
            this.ListsService.EditListitem(this.List, item);
        }
    }

    public async EmptyList(): Promise<boolean> {
        if (this.List) {
            const del = await this.ListsService.EmptyList(this.List);
            return del ?? false;
        }
        return false;
    }

    public async deleteItem(item: Listitem) {
        if (this.List) {
            if (await this.ListsService.DeleteListitem(this.List, item, false)) {
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        }
        this.itemsContainer?.closeSlidingItems();
    }

    public async HideItem(item: Listitem) {
        if (this.List) {
            await this.ListsService.ToggleHiddenListitem(this.List, item);
        }
        this.itemsContainer?.closeSlidingItems();
    }

    public async PinItem(item: Listitem) {
        if (this.List) {
            await this.ListsService.ToggleLockListitem(this.List, item);
        }
        this.itemsContainer?.closeSlidingItems();
    }

    public async AddItem() {
        if (this.List) {
            await this.ListsService.NewListitem(this.List);
            this.appComponent.setAppPages(this.ModifyMainMenu());
        }
    }

    public async HandleReorder(event: CustomEvent<ItemReorderEventDetail>) {
        if (this.List) {
            await this.ListsService.ReorderListitems(this.List, event.detail.complete(this.List.Items) as Listitem[]);
            this._disableClick = true;
            setTimeout(() => {
                this._disableClick = false;
            }, 300);
        }
    }

    public async DeleteList(): Promise<boolean> {
        if (this.List) {
            const del = await this.ListsService.DeleteList(this.List);
            if (del === true) {
                this.NavController.navigateBack("/lists");
            }
            return del ?? false;
        }
        return false;
    }

    public async EditList(): Promise<boolean> {
        if (this.List) {
            this.appComponent.CloseMenu();
            const edit = await this.ListsService.EditList(this.List);
            if (edit == true && this.List.Sync == true && (await this.Preferences.Get(EPrefProperty.SyncListOnDevice, false)) == false) {
                await this.informSyncSettings();
            }
            return true;
        }
        return false;
    }

    public override ModifyMainMenu(): MenuItem[] {
        const menu = [];
        if (this.List) {
            menu.push(MenuitemFactory(EMenuItemType.ListsTrash, { hidden: true }));
            if (this.ConnectIQ.Initialized) {
                menu.push(
                    MenuitemFactory(EMenuItemType.Devices, {
                        title_id: "page_listitems.menu_devices",
                        onClick: async () => {
                            this.ListsService.TransferList(this.List!.Uuid);
                            return true;
                        },
                    }),
                );
            }
            menu.push(
                MenuitemFactory(EMenuItemType.ListitemsTrash, { url_addition: `${this.List.Uuid}`, disabled: !this._useTrash }),
                MenuitemFactory(EMenuItemType.EditList, { onClick: () => this.EditList() }),
                MenuitemFactory(EMenuItemType.EmptyList, { onClick: () => this.EmptyList(), disabled: this.List.Items.length <= 0 }),
                MenuitemFactory(EMenuItemType.DeleteList, { onClick: () => this.DeleteList() }),
            );
        }
        return menu;
    }

    public clickOnItem(event: MouseEvent, item: Listitem) {
        if (this._editMode) {
            if (this.isItemSelected(item)) {
                this._selectedItems = this._selectedItems.filter(l => l != item.Uuid);
            } else {
                this._selectedItems.push(item.Uuid);
            }
        } else {
            this.editItem(item);
        }
        event.stopImmediatePropagation();
    }

    public async QuickAddItem(event: MouseEvent) {
        if (this.List && this.quickAdd?.value && this.quickAdd.value.trim().length > 0) {
            this._forceHideButtons = true;
            event.stopImmediatePropagation();
            await this.ListsService.AddNewListitem(this.List, { item: this.quickAdd.value.trim() });
            await this.ScrollToBottom(true);
            this.cdr.detectChanges();
            this.quickAdd.value = "";
            this.quickAdd.setFocus();
            return false;
        }
        return true;
    }

    public isItemSelected(item: Listitem): boolean {
        return this._selectedItems.indexOf(item.Uuid) >= 0;
    }

    private async informSyncSettings(): Promise<void> {
        if (await this.Popups.Alert.YesNo({ message: "comp-listeditor.sync_settings", translate: true })) {
            this.NavController.navigateForward("/settings/lists-transmission", { queryParams: { syncList: this.List } });
        }
    }

    protected override getEditMenuActions(): EditMenuAction[] {
        return [];
    }
}

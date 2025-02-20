import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonButton, IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonReorder, IonReorderGroup, IonText, IonTextarea, ItemReorderEventDetail, ScrollDetail } from "@ionic/angular/standalone";
import { IonContentCustomEvent } from "@ionic/core";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { EMenuItemType, MenuItem, MenuitemFactory } from "../../../classes/menu-items";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { Listitem } from "../../../services/lists/listitem";
import { Locale } from "../../../services/localization/locale";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-list-items",
    templateUrl: "./list-items.page.html",
    styleUrls: ["./list-items.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonImg, IonText, IonButton, IonTextarea, IonFabButton, IonFab, IonReorder, IonNote, IonItem, IonItemOptions, IonItemSliding, IonIcon, IonItemOption, IonReorderGroup, IonList, IonContent, CommonModule, FormsModule, TranslateModule, MainToolbarComponent, PageAddNewComponent, PageEmptyComponent],
})
export class ListItemsPage extends PageBase {
    @ViewChild("itemsContainer") private itemsContainer?: IonList;
    @ViewChild("mainContent", { read: IonContent, static: false }) mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) listContent?: ElementRef;
    @ViewChild("quickAdd") private quickAdd?: IonTextarea;

    public List?: List | null = undefined;
    private _disableClick = false;
    private _preferencesSubscription?: Subscription;
    private _listSubscription?: Subscription;
    private _useTrash = true;
    private _scrollPosition: "top" | "bottom" | number = "top";
    private _listTitle?: string = undefined;
    private _listInitialized = false;
    private _informedSyncForNewlist: string | number | undefined = undefined;
    private _quickAddFocus = false;

    private readonly Route = inject(ActivatedRoute);

    public get ScrollPosition(): "top" | "bottom" | number {
        return this._scrollPosition;
    }

    public get ShowScrollButtons(): boolean {
        if (!this._listInitialized || this._quickAddFocus) {
            return false;
        }
        return (this.listContent?.nativeElement as HTMLElement)?.scrollHeight > (this.mainContentRef?.nativeElement as HTMLElement)?.clientHeight;
    }

    public get ShowAddButton(): boolean {
        return this._listInitialized && !this._quickAddFocus;
    }

    public get DisableScrollToTop(): boolean {
        return this._scrollPosition == "top";
    }

    public get DisableScrollToBottom(): boolean {
        return this._scrollPosition == "bottom";
    }

    public get ListInitialized(): boolean {
        return this._listInitialized;
    }

    public get PageTitle(): string {
        if (this.List === undefined) {
            if (this._listTitle && this._listTitle.length > 0) {
                return this._listTitle;
            } else {
                return Locale.getText("page_listitems.loading");
            }
        } else {
            return this.List?.Name ?? Locale.getText("page_listitems.page_title");
        }
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._listInitialized = false;
        const listtitle = this.Route.snapshot.queryParamMap.get("title");
        if (listtitle) {
            this._listTitle = listtitle;
        }
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            const uuid = Number(listid);
            this.List = await this.ListsService.GetList(!Number.isNaN(uuid) ? uuid : listid);
            this._listInitialized = true;
            this.reload();
            this.appComponent.setAppPages(this.ModifyMainMenu());
        }
        this._useTrash = await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true);
        this._preferencesSubscription = this.Preferences.onPrefChanged$.subscribe(prop => {
            if (prop.prop == EPrefProperty.TrashListitems) {
                this._useTrash = prop.value as boolean;
            }
        });

        this._listSubscription = this.ListsService.onListChanged$.subscribe(async list => {
            if (list && list.equals(this.List) && list.isPeek == false) {
                this.List = list;
                this.appComponent.setAppPages(this.ModifyMainMenu());
                this._listInitialized = true;
                this.reload();
            }
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
    }

    public onSwipeRight(item: Listitem) {
        this.deleteItem(item);
    }

    public onSwipeLeft(item: Listitem) {
        this.HideItem(item);
    }

    public editItem(item: Listitem) {
        if (this.List && !this._disableClick) {
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
        if (this.List) {
            return [
                MenuitemFactory(EMenuItemType.ListsTrash, { hidden: true }),
                MenuitemFactory(EMenuItemType.Devices, {
                    title_id: "page_listitems.menu_devices",
                    onClick: async () => {
                        this.ListsService.TransferList(this.List!.Uuid);
                        return true;
                    },
                }),
                MenuitemFactory(EMenuItemType.ListitemsTrash, { url_addition: `${this.List.Uuid}`, disabled: !this._useTrash }),
                MenuitemFactory(EMenuItemType.EditList, { onClick: () => this.EditList() }),
                MenuitemFactory(EMenuItemType.EmptyList, { onClick: () => this.EmptyList(), disabled: this.List.Items.length <= 0 }),
                MenuitemFactory(EMenuItemType.DeleteList, { onClick: () => this.DeleteList() }),
            ];
        } else {
            return [];
        }
    }

    public onScroll(event: IonContentCustomEvent<ScrollDetail>) {
        if (event.detail.scrollTop == 0) {
            this._scrollPosition = "top";
        } else if (Math.ceil(event.detail.scrollTop) >= (this.listContent?.nativeElement as HTMLElement)?.scrollHeight - event.target.scrollHeight || (this.listContent?.nativeElement as HTMLElement)?.scrollHeight < event.target.scrollHeight) {
            this._scrollPosition = "bottom";
        } else {
            this._scrollPosition = event.detail.scrollTop;
        }
    }

    public async QuickAddItem() {
        if (this.List && this.quickAdd?.value && this.quickAdd.value.trim().length > 0) {
            await this.ListsService.AddNewListitem(this.List, { item: this.quickAdd.value.trim() });
            this.quickAdd.value = undefined;
            this.quickAdd.setFocus();
            this.cdr.detectChanges();
            return false;
        }
        return true;
    }

    public async onQuickAddFocus() {
        await this.ScrollToBottom();
        this._quickAddFocus = true;
    }

    public async onQuickAddBlur() {
        this._quickAddFocus = false;
        new Promise(resolve => setTimeout(resolve, 500)).then(async () => {
            await this.ScrollToBottom();
        });
    }

    public async ScrollToTop(): Promise<void> {
        await this.mainContent?.scrollToTop(300);
        this.cdr.detectChanges();
    }

    public async ScrollToBottom(instant: boolean = true): Promise<void> {
        await this.mainContent?.scrollToBottom(instant ? 0 : 300);
        this.cdr.detectChanges();
    }

    private async informSyncSettings(): Promise<void> {
        if (
            await this.Popups.Alert.YesNo({
                message: "comp-listeditor.sync_settings",
                translate: true,
            })
        ) {
            this.NavController.navigateForward("/settings/lists-transmission");
        }
    }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonReorder, IonReorderGroup, IonText, ItemReorderEventDetail } from "@ionic/angular/standalone";
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
    imports: [IonImg, IonText, IonFabButton, IonFab, IonReorder, IonNote, IonItem, IonItemOptions, IonItemSliding, IonIcon, IonItemOption, IonReorderGroup, IonList, IonContent, CommonModule, FormsModule, TranslateModule, MainToolbarComponent, PageAddNewComponent, PageEmptyComponent],
})
export class ListItemsPage extends PageBase {
    @ViewChild("itemsContainer") private itemsContainer?: IonList;

    public List?: List | null = undefined;
    private disableClick = false;
    private preferencesSubscription?: Subscription;
    private listSubscriptiion?: Subscription;
    private useTrash = true;

    private readonly Route = inject(ActivatedRoute);

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetList(listid);
            if (this.List) {
                this.cdr.detectChanges();
            }
            this.appComponent.setAppPages(this.ModifyMainMenu());
        }
        this.useTrash = await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true);
        this.preferencesSubscription = this.Preferences.onPrefChanged$.subscribe(prop => {
            if (prop.prop == EPrefProperty.TrashListitems) {
                this.useTrash = prop.value as boolean;
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        });

        this.listSubscriptiion = this.ListsService.onListChanged$.subscribe(async list => {
            if (list && list.equals(this.List) && list.isPeek == false) {
                this.List = list;
                this.appComponent.setAppPages(this.ModifyMainMenu());
                this.cdr.detectChanges();
            }
        });
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
        this.preferencesSubscription?.unsubscribe();
        this.listSubscriptiion?.unsubscribe();
    }

    public get PageTitle(): string {
        if (this.List === undefined) {
            return Locale.getText("page_listitems.loading");
        } else {
            return this.List?.Name ?? Locale.getText("page_listitems.page_title");
        }
    }

    public onSwipeRight(item: Listitem) {
        this.deleteItem(item);
    }

    public onSwipeLeft(item: Listitem) {
        this.HideItem(item);
    }

    public editItem(item: Listitem) {
        if (this.List && !this.disableClick) {
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
            this.disableClick = true;
            setTimeout(() => {
                this.disableClick = false;
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
            this.ListsService.EditList(this.List, false);
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
                MenuitemFactory(EMenuItemType.ListitemsTrash, { url_addition: this.List.Uuid, disabled: !this.useTrash }),
                MenuitemFactory(EMenuItemType.EditList, { onClick: () => this.EditList() }),
                MenuitemFactory(EMenuItemType.EmptyList, { onClick: () => this.EmptyList(), disabled: this.List.Items.length <= 0 }),
                MenuitemFactory(EMenuItemType.DeleteList, { onClick: () => this.DeleteList() }),
            ];
        } else {
            return [];
        }
    }
}

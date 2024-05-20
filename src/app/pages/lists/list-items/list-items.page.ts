import { CommonModule } from "@angular/common";
import { Component, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { IonCol, IonContent, IonFab, IonFabButton, IonGrid, IonHeader, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonReorder, IonReorderGroup, IonRow, IonText, IonTitle, IonToolbar, ItemReorderEventDetail } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { MenuItem, MenuItemDevices, MenuItemEmptyList, MenuItemListitemsTrash } from "../../../classes/menu-items";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { Listitem } from "../../../services/lists/listitem";
import { Locale } from "../../../services/localization/locale";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-list-items",
    templateUrl: "./list-items.page.html",
    styleUrls: ["./list-items.page.scss"],
    standalone: true,
    imports: [IonCol, IonRow, IonImg, IonGrid, IonText, IonFabButton, IonFab, IonReorder, IonNote, IonItem, IonItemOptions, IonItemSliding, IonIcon, IonItemOption, IonReorderGroup, IonList, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, TranslateModule, MainToolbarComponent, PageAddNewComponent, PageEmptyComponent],
})
export class ListItemsPage extends PageBase {
    @ViewChild("itemsContainer") private itemsContainer!: IonList;

    public List?: List | null = undefined;
    private disableClick = false;
    private itemsChangedSubscription?: Subscription;

    private readonly Route = inject(ActivatedRoute);

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetList(listid);
            this.appComponent.setAppPages(this.ModifyMainMenu());
        }
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.itemsChangedSubscription?.unsubscribe();
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
        this.hideItem(item);
    }

    public editItem(item: Listitem) {
        if (this.List && !this.disableClick) {
            this.ListsService.EditListitem(this.List, item);
        }
    }

    public async EmptyList(): Promise<boolean> {
        if (this.List) {
            const del = await this.ListsService.EmptyList(this.List);
            this.appComponent.setAppPages(this.ModifyMainMenu());
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
        this.itemsContainer.closeSlidingItems();
    }

    public async hideItem(item: Listitem) {
        if (this.List) {
            await this.ListsService.ToggleHiddenListitem(this.List, item);
        }
        this.itemsContainer.closeSlidingItems();
    }

    public async addItem() {
        if (this.List) {
            await this.ListsService.NewListitem(this.List);
            this.appComponent.setAppPages(this.ModifyMainMenu());
        }
    }

    public async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
        if (this.List) {
            this.List = await this.ListsService.ReorderListitems(this.List, event.detail.complete(this.List.Items) as Listitem[]);
            this.disableClick = true;
            setTimeout(() => {
                this.disableClick = false;
            }, 300);
        }
    }

    public override ModifyMainMenu(): MenuItem[] {
        if (this.List) {
            //devices
            const menu_devices = MenuItemDevices();
            menu_devices.Title = this.Locale.getText("page_listitems.menu_devices");
            menu_devices.Url += `/${this.List.Uuid}`;
            menu_devices.onClick = async () => {
                this.ConnectIQ.TransmitList(this.List!.Uuid);
                return true;
            };

            let menu = [menu_devices, MenuItemListitemsTrash(this.List.Uuid)];
            if (this.List.Items.length > 0) {
                menu.push(MenuItemEmptyList(() => this.EmptyList()));
            }
            return menu;
        } else {
            return [];
        }
    }
}

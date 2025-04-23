import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonCheckbox, IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonNote, IonReorder, IonReorderGroup, ItemReorderEventDetail } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { type Subscription } from "rxjs";
import { type EditMenuAction } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
import { MainToolbarListsCustomMenuComponent } from "src/app/components/main-toolbar-lists-custom-menu/main-toolbar-lists-custom-menu.component";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { List } from "src/app/services/lists/list";
import { DateUtils } from "../../../classes/utils/date-utils";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { EPrefProperty } from "../../../services/storage/preferences.service";
import { AnimatedListPageBase } from "../animated-list-page-base";

@Component({
    selector: "app-lists",
    templateUrl: "./lists.page.html",
    styleUrls: ["./lists.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonCheckbox, IonLabel, IonReorderGroup, IonNote, IonItemOption, IonItemOptions, IonItemSliding, IonIcon, IonFabButton, IonFab, IonItem, IonReorder, IonList, IonContent, IonImg, MainToolbarComponent, PageAddNewComponent, CommonModule, FormsModule, TranslateModule, PageEmptyComponent, MainToolbarListsCustomMenuComponent],
})
export class ListsPage extends AnimatedListPageBase {
    private _lists: List[] | undefined;
    private _listsSubscription?: Subscription;

    public get Lists(): List[] {
        return this._lists ?? [];
    }

    constructor() {
        super();
        this._animationDirection = "top";
    }

    public override async ionViewWillEnter(): Promise<void> {
        await super.ionViewWillEnter();
        this.ListsService.PurgeListDetails();
        this._lists = await this.ListsService.GetLists(true);
        this._itemsInitialized = true;
        this.onItemsChanged();
        this._listsSubscription = this.ListsService.onListsChanged$.subscribe(lists => {
            if (lists) {
                this._lists = lists;
                this._itemsInitialized = true;
                this.onItemsChanged();
            }
        });
    }

    public override async ionViewWillLeave(): Promise<void> {
        await super.ionViewWillLeave();
        if (this._listsSubscription) {
            this._listsSubscription.unsubscribe();
            this._listsSubscription = undefined;
        }
    }

    public onSwipeRight(list: List) {
        this.itemsContainer.closeSlidingItems();
        this.deleteLists(list);
    }

    public async addList() {
        await this.ListsService.NewList();
    }

    public onSwipeLeft(list: List) {
        this.itemsContainer.closeSlidingItems();
        this.transmitLists(list);
    }

    public async deleteLists(lists: List | List[]): Promise<boolean | undefined> {
        this.itemsContainer.closeSlidingItems();
        const success = await this.ListsService.DeleteList(lists);
        if (success === true) {
            this.reload();
        }
        return success;
    }

    public async emptyLists(lists: List | List[]): Promise<boolean | undefined> {
        this.itemsContainer.closeSlidingItems();
        const success = await this.ListsService.EmptyList(lists);
        if (success === true) {
            this.reload();
        }
        return success;
    }

    public async transmitLists(lists: List | List[]): Promise<boolean | undefined> {
        this.itemsContainer.closeSlidingItems();
        return await this.ListsService.TransferList(lists);
    }

    public async editList(event: MouseEvent, list: List) {
        event.stopImmediatePropagation();
        await this.ListsService.EditList(list);
        if (list.Sync == true && (await this.Preferences.Get(EPrefProperty.SyncListOnDevice, false)) == false) {
            if (
                await this.Popups.Alert.YesNo({
                    message: "comp-listeditor.sync_settings",
                    translate: true,
                })
            ) {
                this.NavController.navigateForward("/settings/lists-transmission", { queryParams: { syncList: list } });
            }
        }
    }

    public clickOnItem(event: MouseEvent, list: List) {
        if (!this._disableClick && this._initAnimationDone) {
            this._disableClick = true;
            if (this._editMode) {
                if (this.isListSelected(list)) {
                    this._selectedItems = this._selectedItems.filter(l => l != list.Uuid);
                } else {
                    this._selectedItems.push(list.Uuid);
                }
            } else {
                this.NavController.navigateForward(`/lists/items/${list.Uuid}`, { queryParams: { title: list.Name } });
            }
            setTimeout(() => {
                this._disableClick = false;
            }, 100);
        }
        event.stopImmediatePropagation();
    }

    public async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
        const lists = event.detail.complete(this._lists);
        await this.ListsService.ReorderLists(lists);
        event.stopImmediatePropagation();
    }

    public UpdatedString(list: List): string {
        return this.Locale.getText("page_lists.updated", { date: DateUtils.formatDate(list.Updated ?? list.Created) });
    }

    public isListSelected(list: List): boolean {
        return this._selectedItems.indexOf(list.Uuid) >= 0;
    }

    public getEditMenuActions(): EditMenuAction[] {
        let texts = [];
        if (this._selectedItems.length == 1) {
            texts = this.Locale.getText(["comp-toolbar-edit-menu.list-transmit", "comp-toolbar-edit-menu.list-empty", "comp-toolbar-edit-menu.list-delete"]);
            texts["transmit"] = texts["comp-toolbar-edit-menu.list-transmit"];
            texts["delete"] = texts["comp-toolbar-edit-menu.list-delete"];
            texts["empty"] = texts["comp-toolbar-edit-menu.list-empty"];
        } else {
            texts = this.Locale.getText(["comp-toolbar-edit-menu.lists-transmit", "comp-toolbar-edit-menu.lists-empty", "comp-toolbar-edit-menu.lists-delete"], { num: this._selectedItems.length });
            texts["transmit"] = texts["comp-toolbar-edit-menu.lists-transmit"];
            texts["delete"] = texts["comp-toolbar-edit-menu.lists-delete"];
            texts["empty"] = texts["comp-toolbar-edit-menu.lists-empty"];
        }

        return [
            {
                text: texts["transmit"],
                icon: "/assets/icons/menu/devices.svg",
                click: async () => {
                    this.editMenu?.leaveEditMode(true);
                    const transmit = await this.transmitLists(this.Lists.filter(l => this._selectedItems.indexOf(l.Uuid) >= 0));
                    if (transmit === true) {
                        this._selectedItems = [];
                    } else if (transmit === undefined) {
                        this.editMenu?.enterEditMode();
                    }
                },
            },
            {
                text: texts["empty"],
                icon: "/assets/icons/menu/empty.svg",
                click: async () => {
                    this.editMenu?.leaveEditMode(true);
                    const empty = await this.emptyLists(this.Lists.filter(l => this._selectedItems.indexOf(l.Uuid) >= 0));
                    if (empty === true) {
                        this._selectedItems = [];
                    } else if (empty === undefined) {
                        this.editMenu?.enterEditMode();
                    }
                },
            },
            {
                text: texts["delete"],
                icon: "/assets/icons/trash.svg",
                click: async () => {
                    this.editMenu?.leaveEditMode(true);
                    const del = await this.deleteLists(this.Lists.filter(l => this._selectedItems.indexOf(l.Uuid) >= 0));
                    if (del === true) {
                        this._selectedItems = [];
                    } else if (del === undefined) {
                        this.editMenu?.enterEditMode();
                    }
                },
            },
        ];
    }
}

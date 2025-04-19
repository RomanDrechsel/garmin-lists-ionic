import { CommonModule } from "@angular/common";
import { Component, ElementRef, inject, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonMenuButton, IonNote, IonReorder, IonReorderGroup, ItemReorderEventDetail, ModalController, ScrollDetail } from "@ionic/angular/standalone";
import { IonContentCustomEvent } from "@ionic/core";
import { TranslateModule } from "@ngx-translate/core";
import { type Subscription } from "rxjs";
import { CreateEditMenuModalAnimation } from "src/app/animations/edit-menu-modal.animation";
import { MainToolbarEditMenuModalComponent } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
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
    imports: [IonCheckbox, IonLabel, IonButtons, IonButton, IonReorderGroup, IonNote, IonItemOption, IonMenuButton, IonItemOptions, IonItemSliding, IonIcon, IonFabButton, IonFab, IonItem, IonReorder, IonList, IonContent, IonImg, MainToolbarComponent, PageAddNewComponent, CommonModule, FormsModule, TranslateModule, PageEmptyComponent],
})
export class ListsPage extends AnimatedListPageBase {
    @ViewChild("listsContainer") private listsContainer!: IonList;
    @ViewChild("mainContent", { read: IonContent, static: false }) mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) listContent?: ElementRef;

    private readonly _modalCtrl = inject(ModalController);
    private _editMenuModal?: HTMLIonModalElement;

    private _lists: List[] | undefined;
    private _listsSubscription?: Subscription;
    private _disableClick = false;
    private _scrollPosition: "top" | "bottom" | number = "top";

    private _listsInitialized = false;

    private _editMode = true;
    private _selectedLists: (Number | String)[] = [];

    public get Lists(): List[] {
        return this._lists ?? [];
    }

    public get EditMode(): boolean {
        return this._editMode;
    }

    public set EditMode(value: boolean) {
        this._editMode = value;
        if (!value) {
            if (this._editMenuModal) {
                this._editMenuModal.dismiss();
                this._editMenuModal = undefined;
            }
        }
    }

    public get ScrollPosition(): "top" | "bottom" | number {
        return this._scrollPosition;
    }

    public get ShowScrollButtons(): boolean {
        if (!this._listsInitialized) {
            return false;
        }
        return (this.listContent?.nativeElement as HTMLElement)?.scrollHeight > (this.mainContentRef?.nativeElement as HTMLElement)?.clientHeight;
    }

    public get DisableScrollToTop(): boolean {
        return this._scrollPosition == "top";
    }

    public get DisableScrollToBottom(): boolean {
        return this._scrollPosition == "bottom";
    }

    public get ListsInitialized(): boolean {
        return this._listsInitialized;
    }

    constructor() {
        super();
        this._animationDirection = "top";
    }

    public override async ionViewWillEnter(): Promise<void> {
        await super.ionViewWillEnter();
        this.ListsService.PurgeListDetails();
        this._lists = await this.ListsService.GetLists(true);
        this._listsInitialized = true;
        this.onItemsChanged();
        this._listsSubscription = this.ListsService.onListsChanged$.subscribe(lists => {
            if (lists) {
                this._lists = lists;
                this._listsInitialized = true;
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
        this.EditMode = false;
    }

    public onSwipeRight(list: List) {
        this.listsContainer.closeSlidingItems();
        this.deleteLists(list);
    }

    public async addList() {
        await this.ListsService.NewList();
    }

    public onSwipeLeft(list: List) {
        this.listsContainer.closeSlidingItems();
        this.transmitLists(list);
    }

    public async deleteLists(lists: List | List[]): Promise<boolean | undefined> {
        this.listsContainer.closeSlidingItems();
        const success = await this.ListsService.DeleteList(lists);
        if (success === true) {
            this.reload();
        }
        return success;
    }

    public async emptyLists(lists: List | List[]): Promise<boolean | undefined> {
        this.listsContainer.closeSlidingItems();
        const success = await this.ListsService.EmptyList(lists);
        if (success === true) {
            this.reload();
        }
        return success;
    }

    public async transmitLists(lists: List | List[]): Promise<boolean | undefined> {
        this.listsContainer.closeSlidingItems();
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
        if (!this._disableClick) {
            if (this._editMode) {
                if (this.isListSelected(list)) {
                    this._selectedLists = this._selectedLists.filter(l => l != list.Uuid);
                } else {
                    this._selectedLists.push(list.Uuid);
                }
            } else {
                this.NavController.navigateForward(`/lists/items/${list.Uuid}`, { queryParams: { title: list.Name } });
            }
            event.stopImmediatePropagation();
        }
    }

    public enterEditMode() {
        this.EditMode = true;
    }

    public leaveEditMode(force: boolean = false) {
        if (force || !this._editMenuModal) {
            this.EditMode = false;
        }

        if (this._editMenuModal) {
            this.toggleEditMenu();
        }
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
        return this._selectedLists.indexOf(list.Uuid) >= 0;
    }

    public disableEditMenu(): boolean {
        return !this._editMode || this._selectedLists.length == 0;
    }

    public async toggleEditMenu() {
        if (this._editMenuModal) {
            await this._editMenuModal.dismiss();
        } else {
            let texts = [];
            if (this._selectedLists.length == 1) {
                texts = this.Locale.getText(["comp-toolbar-edit-menu.list-transmit", "comp-toolbar-edit-menu.list-empty", "comp-toolbar-edit-menu.list-delete"]);
                texts["transmit"] = texts["comp-toolbar-edit-menu.list-transmit"];
                texts["delete"] = texts["comp-toolbar-edit-menu.list-delete"];
                texts["empty"] = texts["comp-toolbar-edit-menu.list-empty"];
            } else {
                texts = this.Locale.getText(["comp-toolbar-edit-menu.lists-transmit", "comp-toolbar-edit-menu.lists-empty", "comp-toolbar-edit-menu.lists-delete"], { num: this._selectedLists.length });
                texts["transmit"] = texts["comp-toolbar-edit-menu.lists-transmit"];
                texts["delete"] = texts["comp-toolbar-edit-menu.lists-delete"];
                texts["empty"] = texts["comp-toolbar-edit-menu.lists-empty"];
            }

            this._editMenuModal = await this._modalCtrl.create({
                component: MainToolbarEditMenuModalComponent,
                cssClass: "edit-menu-modal",
                backdropDismiss: true,
                animated: true,
                showBackdrop: true,
                componentProps: {
                    Methods: [
                        {
                            text: texts["transmit"],
                            icon: "/assets/icons/menu/devices.svg",
                            click: async () => {
                                this.leaveEditMode(true);
                                const transmit = await this.transmitLists(this.Lists.filter(l => this._selectedLists.indexOf(l.Uuid) >= 0));
                                if (transmit === true) {
                                    this._selectedLists = [];
                                } else if (transmit === undefined) {
                                    this.enterEditMode();
                                }
                            },
                        },
                        {
                            text: texts["empty"],
                            icon: "/assets/icons/menu/empty.svg",
                            click: async () => {
                                this.leaveEditMode(true);
                                const empty = await this.emptyLists(this.Lists.filter(l => this._selectedLists.indexOf(l.Uuid) >= 0));
                                if (empty === true) {
                                    this._selectedLists = [];
                                } else if (empty === undefined) {
                                    this.enterEditMode();
                                }
                            },
                        },
                        {
                            text: texts["delete"],
                            icon: "/assets/icons/trash.svg",
                            click: async () => {
                                this.leaveEditMode(true);
                                const del = await this.deleteLists(this.Lists.filter(l => this._selectedLists.indexOf(l.Uuid) >= 0));
                                if (del === true) {
                                    this._selectedLists = [];
                                } else if (del === undefined) {
                                    this.enterEditMode();
                                }
                            },
                        },
                    ],
                },
                enterAnimation: (baseEl: HTMLElement) => CreateEditMenuModalAnimation(baseEl, "enter"),
                leaveAnimation: (baseEl: HTMLElement) => CreateEditMenuModalAnimation(baseEl, "leave"),
            });
            this._editMenuModal.present();
            await this._editMenuModal.onWillDismiss();
            this._editMenuModal = undefined;
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

    public async ScrollToTop() {
        await this.mainContent?.scrollToTop(300);
        this.cdr.detectChanges();
    }

    public async ScrollToBottom(instant: boolean = true) {
        await this.mainContent?.scrollToBottom(instant ? 0 : 300);
        this.cdr.detectChanges();
    }
}

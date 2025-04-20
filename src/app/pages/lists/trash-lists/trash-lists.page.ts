import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import type { EditMenuAction } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
import { EMenuItemType, MenuItem, MenuitemFactory } from "../../../classes/menu-items";
import { DateUtils } from "../../../classes/utils/date-utils";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { AnimatedListPageBase } from "../animated-list-page-base";

@Component({
    selector: "app-trash-lists",
    templateUrl: "./trash-lists.page.html",
    styleUrls: ["./trash-lists.page.scss"],
    imports: [IonContent, IonText, IonNote, IonItem, IonImg, IonIcon, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonFab, IonFabButton, CommonModule, TranslateModule, MainToolbarComponent, PageEmptyComponent],
})
export class TrashListsPage extends AnimatedListPageBase {
    public Lists: List[] = [];
    private _trashChangedSubscription?: Subscription;
    private _trashInitialized = false;
    constructor() {
        super();
        this._animationDirection = "right";
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this._trashChangedSubscription = this.ListsService.onTrashDatasetChanged$.subscribe(lists => {
            this.Lists = lists ?? [];
            if (lists) {
                this.Lists = this.Lists.sort((a, b) => b.Deleted - a.Deleted);
                this._trashInitialized = true;
                this.onItemsChanged();
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        });

        this.Lists = (await this.ListsService.GetTrash()).sort((a: List, b: List) => b.Deleted - a.Deleted);
        this._trashInitialized = true;
        this.onItemsChanged();
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this._trashChangedSubscription?.unsubscribe();
        this._trashChangedSubscription = undefined;
    }

    public override ModifyMainMenu(): MenuItem[] {
        return [MenuitemFactory(EMenuItemType.EmptyListTrash, { onClick: () => this.emptyTrash(), disabled: this.Lists.length <= 0 })];
    }

    public async onSwipeRight(list: List) {
        await this.deleteList(list);
    }

    public async onSwipeLeft(list: List) {
        await this.restoreList(list);
    }

    public async deleteList(list: List) {
        await this.ListsService.EraseListFromTrash(list);
        this.itemsContainer.closeSlidingItems();
    }

    public async restoreList(list: List) {
        await this.ListsService.RestoreListFromTrash(list);
        this.itemsContainer.closeSlidingItems();
    }

    public async emptyTrash(): Promise<boolean> {
        this.appComponent.CloseMenu();
        return (await this.ListsService.WipeTrash()) !== false;
    }

    public DeletedString(list: List): string {
        if (list.Deleted) {
            return this.Locale.getText("page_trash.deleted", { date: DateUtils.formatDate(list.Deleted) });
        } else {
            return "";
        }
    }

    protected override getEditMenuActions(): EditMenuAction[] {
        return [];
    }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import type { EditMenuAction } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
import { EMenuItemType, MenuItem, MenuitemFactory } from "../../../classes/menu-items";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { ListitemModel } from "../../../services/lists/listitem";
import { ListitemTrashModel } from "../../../services/lists/listitems-trash-utils";
import { AnimatedListPageBase } from "../animated-list-page-base";

@Component({
    selector: "app-trash-listitems",
    templateUrl: "./trash-listitems.page.html",
    styleUrls: ["./trash-listitems.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonText, IonItem, IonIcon, IonItemOption, IonItemOptions, IonNote, IonItemSliding, IonList, IonContent, IonImg, CommonModule, IonFab, IonFabButton, TranslateModule, MainToolbarComponent, PageEmptyComponent],
})
export class TrashListitemsPage extends AnimatedListPageBase {
    public Trash?: ListitemTrashModel;

    private _trashChangedSubscription?: Subscription;

    private _listUuid?: string = undefined;

    private Route = inject(ActivatedRoute);

    public get BackLink(): string {
        if (this._listUuid) {
            return `/lists/items/${this._listUuid}`;
        } else {
            return "/lists";
        }
    }

    constructor() {
        super();
        this._animationDirection = "right";
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this._listUuid = listid;
            this.Trash = await this.ListsService.GetListitemTrash(listid);
            if (this.Trash) {
                this.Trash.items = this.Trash.items.sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0));
            }
            this._itemsInitialized = true;
            this.onItemsChanged();
        }

        this._trashChangedSubscription = this.ListsService.onTrashItemsDatasetChanged$.subscribe(trash => {
            if (trash) {
                this.Trash = trash;
                if (this.Trash) {
                    this.Trash.items = this.Trash.items.sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0));
                }
                this._itemsInitialized = true;
                this.onItemsChanged();
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        });
    }

    public override async ionViewDidLeave() {
        await super.ionViewDidLeave();
        this._trashChangedSubscription?.unsubscribe();
    }

    public override ModifyMainMenu(): MenuItem[] {
        return [MenuitemFactory(EMenuItemType.ListsTrash, { hidden: true }), MenuitemFactory(EMenuItemType.EmptyItemTrash, { disabled: this.Trash ? this.Trash?.items.length <= 0 : true, onClick: () => this.emptyTrash() })];
    }

    public onSwipeRight(item: ListitemModel) {
        this.deleteItem(item);
    }

    public onSwipeLeft(item: ListitemModel) {
        this.restoreItem(item);
    }

    public async deleteItem(item: ListitemModel) {
        if (this.Trash) {
            await this.ListsService.EraseListitemFromTrash(this.Trash, item);
            this.reload();
        }
        this.itemsContainer?.closeSlidingItems();
    }

    public async restoreItem(item: ListitemModel) {
        if (this.Trash) {
            await this.ListsService.RestoreListitemFromTrash(this.Trash, item);
            this.reload();
        }
        this.itemsContainer?.closeSlidingItems();
    }

    public async emptyTrash(): Promise<boolean> {
        if (this.Trash) {
            this.ListsService.EmptyListitemTrash(this.Trash);
            this.reload();
        }
        return true;
    }

    protected override getEditMenuActions(): EditMenuAction[] {
        return [];
    }
}

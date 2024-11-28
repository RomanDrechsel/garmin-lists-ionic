import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { EMenuItemType, MenuItem, MenuitemFactory } from "../../../classes/menu-items";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { ListitemModel } from "../../../services/lists/listitem";
import { ListitemTrashModel } from "../../../services/lists/listitems-trash-utils";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-trash-listitems",
    templateUrl: "./trash-listitems.page.html",
    styleUrls: ["./trash-listitems.page.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonText, IonItem, IonIcon, IonItemOption, IonItemOptions, IonNote, IonItemSliding, IonList, IonContent, CommonModule, TranslateModule, MainToolbarComponent, PageEmptyComponent],
})
export class TrashListitemsPage extends PageBase {
    @ViewChild("itemsContainer") private itemsContainer!: IonList;
    public Trash?: ListitemTrashModel;

    private trashChangedSubscription?: Subscription;

    private Route = inject(ActivatedRoute);

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.Trash = await this.ListsService.GetListitemTrash(listid);
            this.cdr.detectChanges();
        }

        this.trashChangedSubscription = this.ListsService.onTrashItemsDatasetChanged$.subscribe(trash => {
            if (trash) {
                this.Trash = trash;
                this.cdr.detectChanges();
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        });
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.trashChangedSubscription?.unsubscribe();
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
        }
        this.itemsContainer.closeSlidingItems();
    }

    public async restoreItem(item: ListitemModel) {
        if (this.Trash) {
            await this.ListsService.RestoreListitemFromTrash(this.Trash, item);
        }
        this.itemsContainer.closeSlidingItems();
    }

    public async emptyTrash(): Promise<boolean> {
        if (this.Trash) {
            this.ListsService.EmptyListitemTrash(this.Trash);
        }
        return true;
    }
}

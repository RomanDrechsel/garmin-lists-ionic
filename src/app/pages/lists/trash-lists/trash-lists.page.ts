import { CommonModule } from "@angular/common";
import { Component, ViewChild } from "@angular/core";
import { IonContent, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MenuItem, MenuItemEmptyListTrash } from "../../../classes/menu-items";
import { DateUtils } from "../../../classes/utils/dateutils";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-trash-lists",
    templateUrl: "./trash-lists.page.html",
    styleUrls: ["./trash-lists.page.scss"],
    standalone: true,
    imports: [IonContent, IonText, IonNote, IonItem, IonIcon, IonItemOption, IonItemOptions, IonItemSliding, IonList, CommonModule, TranslateModule, MainToolbarComponent, PageEmptyComponent],
})
export class TrashListsPage extends PageBase {
    @ViewChild("listsContainer") private listsContainer!: IonList;

    public Lists: List[] = [];
    private trashChangedSubscription?: Subscription;

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this.trashChangedSubscription = this.ListsService.onTrashDatasetChanged$.subscribe(lists => {
            this.Lists = lists ?? [];
            this.appComponent.setAppPages(this.ModifyMainMenu());
        });
        this.Lists = await this.ListsService.GetTrash();
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.trashChangedSubscription?.unsubscribe();
    }

    public override ModifyMainMenu(): MenuItem[] {
        const empty = MenuItemEmptyListTrash(() => this.emptyTrash());
        if (this.Lists.length <= 0) {
            empty.Disabled = true;
        }
        return [empty];
    }

    public async onSwipeRight(list: List) {
        await this.deleteList(list);
    }

    public async onSwipeLeft(list: List) {
        await this.restoreList(list);
    }

    public async deleteList(list: List) {
        await this.ListsService.EraseListFromTrash(list);
        this.listsContainer.closeSlidingItems();
    }

    public async restoreList(list: List) {
        await this.ListsService.RestoreListFromTrash(list);
        this.listsContainer.closeSlidingItems();
    }

    public async emptyTrash(): Promise<boolean> {
        return (await this.ListsService.WipeTrash()) !== false;
    }

    public DeletedString(list: List): string {
        if (list.Deleted) {
            return this.Locale.getText("page_trash.deleted", { date: DateUtils.formatDate(list.Deleted) });
        } else {
            return "";
        }
    }
}

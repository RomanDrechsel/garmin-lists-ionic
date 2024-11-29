import { CommonModule } from "@angular/common";
import { Component, ViewChild, WritableSignal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFab, IonFabButton, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonReorder, IonReorderGroup, ItemReorderEventDetail } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import { List } from "src/app/services/lists/list";
import { DateUtils } from "../../../classes/utils/date-utils";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-lists",
    templateUrl: "./lists.page.html",
    styleUrls: ["./lists.page.scss"],
    imports: [IonNote, IonItemOption, IonItemOptions, IonItemSliding, IonIcon, IonFabButton, IonFab, IonItem, IonReorder, IonReorderGroup, IonList, IonContent, MainToolbarComponent, PageAddNewComponent, CommonModule, FormsModule, TranslateModule],
})
export class ListsPage extends PageBase {
    @ViewChild("listsContainer") private listsContainer!: IonList;

    public Lists: WritableSignal<List[]> = this.ListsService.Lists;
    private disableClick = false;

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this.ListsService.PurgeListDetails();
    }

    public onSwipeRight(list: List) {
        this.listsContainer.closeSlidingItems();
        this.deleteList(list);
    }

    public async addList() {
        await this.ListsService.NewList();
    }

    public onSwipeLeft(list: List) {
        this.listsContainer.closeSlidingItems();
        this.transmitList(list);
    }

    public async deleteList(list: List) {
        const res = await this.ListsService.DeleteList(list);
        if (res !== undefined) {
            this.listsContainer.closeSlidingItems();
        }
    }

    public async emptyList(list: List) {
        if ((await this.ListsService.EmptyList(list)) === true) {
            this.listsContainer.closeSlidingItems();
        }
    }

    public async transmitList(list: List) {
        await this.ListsService.TransferList(list.Uuid);
        this.listsContainer.closeSlidingItems();
    }

    public editList(event: MouseEvent, list: List) {
        this.ListsService.EditList(list, true);
        event.stopImmediatePropagation();
    }

    public gotoList(list: List) {
        if (!this.disableClick) {
            this.NavController.navigateForward(`/lists/items/${list.Uuid}`);
        }
    }

    public async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
        const lists = event.detail.complete(this.Lists());
        await this.ListsService.ReorderLists(lists);
        event.stopImmediatePropagation();
    }

    public UpdatedString(list: List): string {
        return this.Locale.getText("page_lists.updated", { date: DateUtils.formatDate(list.Updated ?? list.Created) });
    }
}

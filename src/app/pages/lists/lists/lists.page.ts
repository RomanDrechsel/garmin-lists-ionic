import { CommonModule } from "@angular/common";
import { Component, ViewChild, WritableSignal, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonImg, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonNote, IonReorder, IonReorderGroup, IonText, IonTitle, IonToolbar, ItemReorderEventDetail, NavController } from "@ionic/angular/standalone";
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
    standalone: true,
    imports: [IonImg, IonText, IonInput, IonNote, IonItemOption, IonItemOptions, IonItemSliding, IonIcon, IonFabButton, IonFab, IonLabel, IonItem, IonReorder, IonReorderGroup, IonList, IonContent, IonHeader, IonTitle, IonToolbar, MainToolbarComponent, PageAddNewComponent, CommonModule, FormsModule, TranslateModule],
})
export class ListsPage extends PageBase {
    @ViewChild("listsContainer") private listsContainer!: IonList;

    public Lists: WritableSignal<List[]> = this.ListsService.Lists;
    private disableClick = false;

    private readonly NavController = inject(NavController);

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
        await this.ConnectIQ.TransmitList(list.Uuid);
        this.listsContainer.closeSlidingItems();
    }

    public editList(event: MouseEvent, list: List) {
        this.ListsService.RenameList(list);
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

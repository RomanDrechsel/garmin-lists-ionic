import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild, WritableSignal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFab, IonFabButton, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonReorder, IonReorderGroup, ItemReorderEventDetail, ScrollDetail } from "@ionic/angular/standalone";
import { IonContentCustomEvent } from "@ionic/core";
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
    @ViewChild("mainContent", { read: IonContent, static: false }) mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) listContent?: ElementRef;

    public Lists: WritableSignal<List[]> = this.ListsService.Lists;
    private _disableClick = false;
    private _scrollPosition: "top" | "bottom" | number = "top";

    public get ScrollPosition(): "top" | "bottom" | number {
        return this._scrollPosition;
    }

    public get ShowScrollButtons(): boolean {
        return (this.listContent?.nativeElement as HTMLElement)?.scrollHeight > (this.mainContentRef?.nativeElement as HTMLElement)?.clientHeight;
    }

    public get DisableScrollToTop(): boolean {
        return this._scrollPosition == "top";
    }

    public get DisableScrollToBottom(): boolean {
        return this._scrollPosition == "bottom";
    }

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
            this.reload();
        }
    }

    public async emptyList(list: List) {
        if ((await this.ListsService.EmptyList(list)) === true) {
            this.listsContainer.closeSlidingItems();
            this.reload();
        }
    }

    public async transmitList(list: List) {
        await this.ListsService.TransferList(list.Uuid);
        this.listsContainer.closeSlidingItems();
    }

    public editList(event: MouseEvent, list: List) {
        event.stopImmediatePropagation();
        this.ListsService.EditList(list);
    }

    public gotoList(event: MouseEvent, list: List) {
        if (!this._disableClick) {
            this.NavController.navigateForward(`/lists/items/${list.Uuid}`);
            event.stopImmediatePropagation();
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

    public onScroll(event: IonContentCustomEvent<ScrollDetail>) {
        if (event.detail.scrollTop == 0) {
            this._scrollPosition = "top";
        } else if (event.detail.scrollTop >= (this.listContent?.nativeElement as HTMLElement)?.scrollHeight - event.target.scrollHeight || (this.listContent?.nativeElement as HTMLElement)?.scrollHeight < event.target.scrollHeight) {
            this._scrollPosition = "bottom";
        } else {
            this._scrollPosition = event.detail.scrollTop;
        }
    }

    public ScrollToTop() {
        this.mainContent?.scrollToTop(300);
    }

    public ScrollToBottom(instant: boolean = true) {
        this.mainContent?.scrollToBottom(instant ? 0 : 300);
    }
}

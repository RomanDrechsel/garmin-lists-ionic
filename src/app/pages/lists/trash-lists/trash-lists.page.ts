import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText, ScrollDetail } from "@ionic/angular/standalone";
import { IonContentCustomEvent } from "@ionic/core";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
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
    @ViewChild("listsContainer") private listsContainer!: IonList;
    @ViewChild("mainContent", { read: IonContent, static: false }) mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) listContent?: ElementRef;

    public Lists: List[] = [];
    private _trashChangedSubscription?: Subscription;
    private _scrollPosition: "top" | "bottom" | number = "top";
    private _trashInitialized = false;

    public get ScrollPosition(): "top" | "bottom" | number {
        return this._scrollPosition;
    }

    public get ShowScrollButtons(): boolean {
        if (!this._trashInitialized) {
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

    public get TrashInitialized(): boolean {
        return this._trashInitialized;
    }

    constructor() {
        super();
        this._animationDirection = "right";
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this._trashInitialized = false;
        this._trashChangedSubscription = this.ListsService.onTrashDatasetChanged$.subscribe(lists => {
            this.Lists = lists ?? [];
            if (lists) {
                this.Lists = this.Lists.sort((a, b) => b.Deleted - a.Deleted);
                this._trashInitialized = true;
                this.animateNewItems();
                this.appComponent.setAppPages(this.ModifyMainMenu());
            }
        });

        this.Lists = (await this.ListsService.GetTrash()).sort((a: List, b: List) => b.Deleted - a.Deleted);
        this._trashInitialized = true;
        this.animateNewItems();
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
        this.listsContainer.closeSlidingItems();
    }

    public async restoreList(list: List) {
        await this.ListsService.RestoreListFromTrash(list);
        this.listsContainer.closeSlidingItems();
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

    protected getItemCount(): number {
        return this.Lists?.length ?? 0;
    }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, inject, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFab, IonFabButton, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText, ScrollDetail } from "@ionic/angular/standalone";
import { IonContentCustomEvent } from "@ionic/core";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
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
    @ViewChild("itemsContainer") private itemsContainer?: IonList;
    public Trash?: ListitemTrashModel;

    @ViewChild("mainContent", { read: IonContent, static: false }) mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) listContent?: ElementRef;

    private _trashChangedSubscription?: Subscription;

    private _scrollPosition: "top" | "bottom" | number = "top";

    private _trashInitialized = false;

    private _listUuid?: string = undefined;

    private Route = inject(ActivatedRoute);

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
        this._trashInitialized = false;
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this._listUuid = listid;
            this.Trash = await this.ListsService.GetListitemTrash(listid);
            if (this.Trash) {
                this.Trash.items = this.Trash.items.sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0));
            }
            this._trashInitialized = true;
            this.animateNewItems();
        }

        this._trashChangedSubscription = this.ListsService.onTrashItemsDatasetChanged$.subscribe(trash => {
            if (trash) {
                this.Trash = trash;
                if (this.Trash) {
                    this.Trash.items = this.Trash.items.sort((a, b) => (b.deleted ?? 0) - (a.deleted ?? 0));
                }
                this._trashInitialized = true;
                this.animateNewItems();
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

    public onScroll(event: IonContentCustomEvent<ScrollDetail>) {
        console.log(Math.ceil(event.detail.scrollTop), (this.listContent?.nativeElement as HTMLElement)?.scrollHeight - event.target.scrollHeight);
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
        return this.Trash?.items?.length ?? 0;
    }
}

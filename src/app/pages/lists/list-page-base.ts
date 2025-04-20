import { Component, ElementRef, inject, ViewChild } from "@angular/core";
import { IonContent, IonList, ModalController } from "@ionic/angular/standalone";
import { IonContentCustomEvent, type ScrollDetail } from "@ionic/core";
import { type EditMenuAction } from "src/app/components/main-toolbar-edit-menu-modal/main-toolbar-edit-menu-modal.component";
import { MainToolbarListsCustomMenuComponent } from "src/app/components/main-toolbar-lists-custom-menu/main-toolbar-lists-custom-menu.component";
import { PageBase } from "../page-base";

@Component({
    template: "",
})
export abstract class ListPageBase extends PageBase {
    @ViewChild("listsContainer") protected itemsContainer!: IonList;
    @ViewChild("mainContent", { read: IonContent, static: false }) protected mainContent?: IonContent;
    @ViewChild("mainContent", { read: ElementRef, static: false }) protected mainContentRef?: ElementRef;
    @ViewChild("listContent", { read: ElementRef, static: false }) protected listContent?: ElementRef;
    @ViewChild(MainToolbarListsCustomMenuComponent, { read: MainToolbarListsCustomMenuComponent, static: false }) protected editMenu?: MainToolbarListsCustomMenuComponent;

    protected readonly _modalCtrl = inject(ModalController);
    protected _disableClick = false;

    protected _scrollPosition: "top" | "bottom" | number = "top";
    protected _itemsInitialized = false;

    protected _editMode = true;
    protected _selectedItems: (Number | String)[] = [];

    public get EditMode(): boolean {
        return this._editMode;
    }

    public set EditMode(val: boolean) {
        this._editMode = val;
    }

    public get ScrollPosition(): "top" | "bottom" | number {
        return this._scrollPosition;
    }

    public get ShowScrollButtons(): boolean {
        if (!this._itemsInitialized) {
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

    public get ItemsInitialized(): boolean {
        return this._itemsInitialized;
    }

    public override async ionViewWillEnter(): Promise<void> {
        await super.ionViewWillEnter();
        this._editMode = false;
        this._selectedItems = [];
    }

    public override async ionViewWillLeave(): Promise<void> {
        await super.ionViewWillLeave();
        this._editMode = false;
        this._selectedItems = [];
    }

    public EditMenuDisabled(): boolean {
        return !this._editMode || this._selectedItems.length == 0;
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

    onEditModeChanged(val: boolean) {
        this._editMode = val;
        console.log("EditMode geändert:", this._editMode);
    }

    protected abstract getEditMenuActions(): EditMenuAction[];
}

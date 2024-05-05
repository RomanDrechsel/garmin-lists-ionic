import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from "@angular/router";
import { IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonImg, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel, IonList, IonNote, IonReorder, IonReorderGroup, IonText, IonTitle, IonToolbar, ItemReorderEventDetail } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from "rxjs";
import { MainToolbarComponent } from 'src/app/components/main-toolbar/main-toolbar.component';
import { List } from 'src/app/services/lists/list';
import { DateUtils } from "../../../classes/utils/dateutils";
import { PageAddNewComponent } from "../../../components/page-add-new/page-add-new.component";
import { PageBase } from "../../page-base";

@Component({
    selector: 'app-lists',
    templateUrl: './lists.page.html',
    styleUrls: ['./lists.page.scss'],
    standalone: true,
    imports: [
        IonImg,
        IonText,
        IonInput,
        IonNote,
        IonItemOption,
        IonItemOptions,
        IonItemSliding,
        IonIcon,
        IonFabButton,
        IonFab,
        IonLabel,
        IonItem,
        IonReorder,
        IonReorderGroup,
        IonList,
        IonContent,
        IonHeader,
        IonTitle,
        IonToolbar,
        MainToolbarComponent,
        PageAddNewComponent,
        CommonModule,
        FormsModule,
        TranslateModule
    ]
})
export class ListsPage extends PageBase {
    @ViewChild('listsContainer') private listsContainer!: IonList;

    public Lists: List[] = [];
    private listsChangedSubscription?: Subscription;
    private disableClick = false;

    constructor(private Router: Router) {
        super();
    }

    public override async ionViewWillEnter() {
        super.ionViewWillEnter();
        this.listsChangedSubscription = this.ListsService.onTrashDatasetChanged$.subscribe(lists => {
            this.Lists = lists ?? [];
        });
        this.Lists = await this.ListsService.GetLists();
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.listsChangedSubscription?.unsubscribe();
    }

    public onSwipeRight(list: List) {
        this.deleteList(list);
    }

    public async addList() {
        this.ListsService.NewList();
    }

    public onSwipeLeft(list: List) {
        this.transmitList(list);
    }

    public async deleteList(list: List) {
        if (await this.ListsService.DeleteList(list)) {
            this.Popups.Toast.Success("service-lists.delete_success");
        }
        else {
            this.Popups.Toast.Error("service-lists.delete_error");
        }
        this.listsContainer.closeSlidingItems();
    }

    public async emptyList(list: List) {
        if (await this.ListsService.EmptyList(list)) {
            this.listsContainer.closeSlidingItems();
        }
    }

    public async transmitList(list: List) {
        await this.ConnectIQ.TransmitList(list.Uuid);
        this.listsContainer.closeSlidingItems();
    }

    public editList(event: MouseEvent, list: List) {
        this.ListsService.EditList(list);
        event.stopImmediatePropagation();
    }

    public gotoList(list: List) {
        if (!this.disableClick) {
            this.Router.navigateByUrl(`/lists/items/${list.Uuid}`);
        }
    }

    public async handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
        this.Lists = await this.ListsService.ReorderLists(event.detail.complete(this.Lists));
        event.stopImmediatePropagation();
    }

    public UpdatedString(list: List): string {
        return this.Locale.getText("page_lists.updated", { date: DateUtils.formatDate(list.Updated ?? list.Created) });
    }
}

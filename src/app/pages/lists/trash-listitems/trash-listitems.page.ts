import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonIcon, IonImg, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonNote, IonText } from '@ionic/angular/standalone';
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { MenuItem, MenuItemEmptyListTrash } from "../../../classes/menu-items";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageEmptyComponent } from "../../../components/page-empty/page-empty.component";
import { List } from "../../../services/lists/list";
import { Listitem } from "../../../services/lists/listitem";
import { PageBase } from "../../page-base";

@Component({
    selector: 'app-trash-listitems',
    templateUrl: './trash-listitems.page.html',
    styleUrls: ['./trash-listitems.page.scss'],
    standalone: true,
    imports: [IonImg,
        IonText,
        IonItem,
        IonIcon,
        IonItemOption,
        IonItemOptions,
        IonNote,
        IonItemSliding,
        IonList,
        IonContent,
        CommonModule,
        TranslateModule,
        MainToolbarComponent,
        PageEmptyComponent,
    ]
})
export class TrashListitemsPage extends PageBase {
    @ViewChild('itemsContainer') private itemsContainer!: IonList;
    public List?: List;

    private itemsChangedSubscription?: Subscription;

    constructor(private Route: ActivatedRoute) {
        super();
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        const listid = this.Route.snapshot.paramMap.get("uuid");
        if (listid) {
            this.List = await this.ListsService.GetListItemsFromTrash(listid);
        }
    }

    public override async ionViewDidLeave() {
        super.ionViewDidLeave();
        this.itemsChangedSubscription?.unsubscribe();
    }

    public override ModifyMainMenu(): MenuItem[] {
        if (this.List && this.List.TrashItems.length > 0) {
            return [MenuItemEmptyListTrash(() => this.emptyTrash())];
        }
        else {
            return [];
        }
    }

    public onSwipeRight(item: Listitem) {
        this.deleteItem(item);
    }

    public onSwipeLeft(item: Listitem) {
        this.restoreItem(item);
    }

    public async deleteItem(item: Listitem) {
        if (this.List) {
            await this.ListsService.EraseListitemFromTrash(this.List, item);
        }
        this.itemsContainer.closeSlidingItems();
    }

    public async restoreItem(item: Listitem) {
        if (this.List) {
            await this.ListsService.RestoreListitemFromTrash(this.List, item);
        }
        this.itemsContainer.closeSlidingItems();
    }

    public async emptyTrash(): Promise<boolean> {
        if (this.List) {
            this.ListsService.EmptyListitemTrash(this.List);
        }
        return true;
    }
}

import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Keyboard } from "@capacitor/keyboard";
import { ModalController } from "@ionic/angular/standalone";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { HelperUtils } from "../../classes/utils/helperutils";
import { StringUtils } from "../../classes/utils/stringutils";
import { ListEditor } from "../../components/list-editor/list-editor.component";
import { ListItemEditor } from "../../components/list-item-editor/list-item-editor.component";
import { AppService } from "../app/app.service";
import { LocalizationService } from "../localization/localization.service";
import { Logger } from "../logging/logger";
import { PopupsService } from "../popups/popups.service";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { KeepInTrash } from "./keep-in-trash";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListitemsStorageService } from "./listitems-storage.service";
import { ListsStorageService } from "./lists-storage.service";
import { TrashItemsStorageService } from "./trash-items-storage-service";
import { TrashStorageService } from "./trash-storage.service";

@Injectable({
    providedIn: "root",
})
export class _ListsService {
    private onListsDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onListsDatasetChanged$ = this.onListsDatasetChangedSubject.asObservable();
    private onTrashDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onTrashDatasetChanged$ = this.onTrashDatasetChangedSubject.asObservable();

    public _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;
    private _removeOldTrashEntries?: Subscription;

    public readonly Trash = inject(TrashStorageService);
    public readonly TrashItems = inject(TrashItemsStorageService);
    public readonly Lists = inject(ListsStorageService);
    public readonly Listitems = inject(ListitemsStorageService);
    private readonly modalCtrl = inject(ModalController);
    private readonly Router = inject(Router);
    private readonly Popups = inject(PopupsService);
    private readonly Preferences = inject(PreferencesService);
    private readonly Locale = inject(LocalizationService);

    public async Initialize() {
        this.KeepInTrashStock = await this.Preferences.Get<number>(EPrefProperty.TrashKeepinStock, this._keepInTrashStock);
        this.Preferences.onPrefChanged$.subscribe(arg => {
            if (arg.prop == EPrefProperty.TrashKeepinStock) {
                this.KeepInTrashStock = arg.value;
            }
        });
    }

    private set KeepInTrashStock(value: number | KeepInTrash.Enum) {
        value = KeepInTrash.FromNumber(value);
        this._keepInTrashStock = value;
        if (KeepInTrash.StockPeriod(value)) {
            this._removeOldTrashEntries?.unsubscribe();
            this._removeOldTrashEntries = interval(value * 60 * 60 * 24).subscribe(() => {
                this.removeOldTrashEntries(value * 60 * 60 * 24);
            });
            this.removeOldTrashEntries(value * 60 * 60 * 24);
        } else {
            this._removeOldTrashEntries?.unsubscribe();
            this._removeOldTrashEntries = undefined;
            this.checkTrashLimit();
        }
    }

    /**
     * gets all lists
     * @returns array of all lists
     */
    public async GetLists(): Promise<List[]> {
        return this.Lists.GetLists();
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | null> {
        const list = await this.Lists.GetListWithoutItems(uuid);
        if (list) {
            //get items
            const items = await this.Listitems.GetItems(list);
            if (items) {
                list.Items = items;
            }
            return list;
        } else {
            return null;
        }
    }

    /**
     * gets all lists in trash
     * @returns array of all lists in trash
     */
    public async GetTrash(): Promise<List[]> {
        return this.Trash.GetLists();
    }

    /**
     * gets a specific list OUTSIDE of trash and its listitems in Trash
     * @param uuid unique id of the list OUTSIDE of trash
     * @returns List object
     */
    public async GetListItemsFromTrash(uuid: string): Promise<List | undefined> {
        const list = await this.Lists.GetListWithoutItems(uuid);
        if (list) {
            //get items
            const items = await this.TrashItems.GetItems(list);
            if (items) {
                list.TrashItems = items;
            }
            return list;
        } else {
            return undefined;
        }
    }

    /**
     * opens the list editor to create a new list
     */
    public async NewList() {
        if (AppService.isMobileApp) {
            await Keyboard.show();
        }
        const listname = await ListEditor(this.modalCtrl);
        if (listname) {
            const list = List.Create({ name: listname, uuid: await this.createUuid(), order: (await this.GetLists()).length });
            if (await this.StoreList(list)) {
                //this.onListsDatasetChangedSubject.next(await this.GetLists());
                Logger.Notice(`Created new list ${list.toLog()}`);
                this.Router.navigateByUrl(`/lists/items/${list.Uuid}`);
            } else {
                this.Popups.Toast.Error("service-lists.store_list_error");
            }
        }
    }

    /**
     * opens the list editor to edit the title of a list
     * @param list list to be edited
     */
    public async EditList(list: List) {
        const listname = await ListEditor(this.modalCtrl, { listname: list.Name, purpose: "edit" });
        if (listname) {
            list.Name = listname;
            if ((await this.StoreList(list)) == false) {
                this.Popups.Toast.Error("service-lists.store_list_error");
            } else {
                Logger.Notice(`Edited list ${list.toLog()}`);
            }
        }
    }

    /**
     * prompts the user to delete a list
     * @param list list to be deleted
     * @param force delete the list without prompt
     * @returns list deletion successful? undefined if the user canceled it
     */
    public async DeleteList(list: List, force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmDeleteList, true))) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.delete_confirm", { name: StringUtils.shorten(list.Name, 40) }) })) {
                return await this.removeListFromStorage(list);
            } else {
                return undefined;
            }
        } else {
            return await this.removeListFromStorage(list);
        }
    }

    /**
     * prompts the user to delete all items of a list
     * @param list list to be emptied
     * @param force empty the list without prompt
     * @returns deletion successful? undefined if user canceled it
     */
    public async EmptyList(list: List, force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEmptyList, true))) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.empty_confirm", { name: StringUtils.shorten(list.Name, 40) }) })) {
                return await this.emptyList(list);
            } else {
                return undefined;
            }
        } else {
            return await this.emptyList(list);
        }
    }

    /**
     * opens the listitem editor to create a new listitem
     * @param list list, the new item should be part of
     * @returns item-creation successful?
     */
    public async NewListitem(list: List): Promise<boolean | undefined> {
        if (AppService.isMobileApp) {
            Keyboard.show();
        }
        const obj = await ListItemEditor(this.modalCtrl);
        if (obj) {
            const item = Listitem.Create(obj);
            if ((await this.storeListitem(item, list)) !== false) {
                list.AddItem(item);
                await this.StoreList(list); //store update-date
                Logger.Notice(`Created new listitem ${item.toLog()}`);
                return true;
            } else {
                return false;
            }
        } else {
            return undefined;
        }
    }

    /**
     * opens the listitem editor to edit an item
     * @param list list, the item is part of
     * @param item item to be edited
     * @returns editing successful? undefined if user canceled it
     */
    public async EditListitem(list: List, item: Listitem): Promise<boolean | undefined> {
        const obj = await ListItemEditor(this.modalCtrl, { item: item.Item, note: item.Note, purpose: "edit" });
        if (obj) {
            item.fromInput(obj);
            if (await this.storeListitem(item, list)) {
                Logger.Notice(`Edited listitem ${item.toLog()}`);
                return true;
            } else {
                return false;
            }
        } else {
            return undefined;
        }
    }

    /**
     * prompts the user to delete an list item
     * @param list list, the item is part of
     * @param item item to be deleted
     * @param force delete the listitem without prompting
     * @returns deletion successful? undefined if user canceled it
     */
    public async DeleteListitem(list: List, item: Listitem, force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmDeleteListitem, true))) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.delete_item_confirm", { name: StringUtils.shorten(item.Item, 40) }) })) {
                return this.removeListitemFromStorage(list, item);
            } else {
                return undefined;
            }
        } else {
            return this.removeListitemFromStorage(list, item);
        }
    }

    /**
     * prompts the user to finally erase a listitem from trash
     * @param list the list OUTSIDE the trash, the item is part of
     * @param item the item in Trash to be erased
     * @returns erase successful, undefined if user canceled it
     */
    public async EraseListitemFromTrash(list: List, item: Listitem): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEraseListitem, true)) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.erase_item_confirm", { name: StringUtils.shorten(item.Item, 40) }) })) {
                return this.eraseListitemFromTrash(list, item);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListitemFromTrash(list, item);
        }
    }

    /**
     * prompts the user to empty the lists trash
     * @returns empty successfull, undefined if user canceled it
     */
    public async EmptyTrash(force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true))) {
            let text;
            const count = (await this.GetTrash()).length;
            if (count == 1) {
                text = this.Locale.getText("service-lists.empty_trash_confirm_single");
            } else {
                text = this.Locale.getText("service-lists.empty_trash_confirm", { count: count });
            }
            text += this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.emptyTrash();
            } else {
                return undefined;
            }
        } else {
            return this.emptyTrash();
        }
    }

    /**
     * removes all listitems from trash for a certain list
     * @param list the list, the items in trash should be removed
     * @returns removal successful? undefined if the user canceled it
     */
    public async EmptyListitemTrash(list: List): Promise<boolean | undefined> {
        if (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true)) {
            let text;
            const full_list = await this.GetListItemsFromTrash(list.Uuid);
            if (full_list) {
                list.TrashItems = full_list.TrashItems;
            }
            if (list.TrashItems.length == 1) {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm_single", { name: list.Name });
            } else {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm", { name: list.Name, count: list.TrashItems.length });
            }
            text += this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.emptyListitemTrash(list);
            } else {
                return undefined;
            }
        } else {
            return this.emptyListitemTrash(list);
        }
    }

    /**
     * correct the order numbers of lists
     * @param lists lists to be ordered
     * @returns lists with updated order numbers
     */
    public async ReorderLists(lists: List[]): Promise<List[]> {
        lists = await this.cleanOrderLists(lists);
        return lists;
    }

    /**
     * correct the order numbers of listitems
     * @param list list, the items are part of
     * @param items items to be ordered
     * @returns list with reordered listitems
     */
    public async ReorderListitems(list: List, items: Listitem[]): Promise<List> {
        list.Items = items;
        list = await this.cleanOrderListitems(list);

        return list;
    }

    /**
     * toggles the hidden state of a listitem
     * @param list list, the item is part of
     * @param item listitem, hiddenstate should be toggled
     */
    public async ToggleHiddenListitem(list: List, item: Listitem) {
        item.Hidden = !item.Hidden;
        await this.storeListitem(item, list);
    }

    /**
     * prompts the user to erase a list from trash
     * @param list list to be erased
     * @param force erase the list without user prompt
     * @returns erase successful? undefined if user canceled it
     */
    public async EraseListFromTrash(list: List, force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEraseList, true))) {
            const text = this.Locale.getText("service-lists.erase_confirm", { name: StringUtils.shorten(list.Name, 40) }) + this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.eraseListFromTrashStorage(list);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListFromTrashStorage(list);
        }
    }

    /**
     * prompts the user to restore a list from trash
     * @param list list to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListFromTrash(list: List): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmRestoreList, true)) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.restore_confirm", { name: StringUtils.shorten(list.Name, 40) }) })) {
                return this.restoreListFromTrash(list);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListFromTrash(list);
        }
    }

    /**
     * prompts the user to restore a list item
     * @param list list, to which the item should be restored
     * @param item item in TRASH to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListitemFromTrash(list: List, item: Listitem): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmRestoreListitem, true)) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.restore_item_confirm", { name: StringUtils.shorten(item.Item, 40) }) })) {
                return this.restoreListitemFromTrash(list, item);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListitemFromTrash(list, item);
        }
    }

    /**
     * stores a list in backend up there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean> {
        if (await this.Lists.StoreList(list, force)) {
            return await this.Listitems.StoreList(list, force);
        } else {
            return false;
        }
    }

    /**
     * creates a unique list id
     * @returns unique id
     */
    public async createUuid(): Promise<string> {
        let uuid = HelperUtils.createUUID(20);
        //check, if the uuid already exists for a list or in trash
        while ((await this.Lists.GetListWithoutItems(uuid, true)) || (await this.Trash.GetListWithoutItems(uuid, true))) {
            uuid = HelperUtils.createUUID(20);
        }
        return uuid;
    }

    /**
     * stores a listitem in backend up there are any changes
     * @param item item to be stored
     * @param list list, the item is part of
     * @param force store the listitem, even if there are no changes
     * @returns storage successful
     */
    private async storeListitem(item: Listitem, list: List, force: boolean = false): Promise<boolean> {
        const res = await this.Listitems.StoreListitem(item, list.Uuid, force);
        if (res === true) {
            list.Updated = Date.now();
            await this.StoreList(list);
            return true;
        } else if (res == false) {
            this.Popups.Toast.Error("service-lists.store_listitem_error");
            return false;
        } else {
            return true;
        }
    }

    /**
     * removes a list to the trash (if the user enabled it)
     * @param list list to be moved
     * @returns deletion of the list and move to trash successful
     */
    private async removeListFromStorage(list: List): Promise<boolean> {
        //get the list items
        const items = await this.Listitems.GetItems(list);
        if (items) {
            list.Items = items;
        }
        const useTrash = await this.useTrash();
        if (!useTrash || (await this.Trash.StoreList(list))) {
            if (await this.Lists.RemoveList(list)) {
                if (!useTrash) {
                    //list was not moved to trash - erase listitems
                    await this.Listitems.RemoveList(list);
                } else {
                    //list was moved to trash, check if the trash limit has been exceeded
                    await this.checkTrashLimit();
                }
                await this.cleanOrderLists(await this.GetLists(), true); //emits dataset changed event
                Logger.Notice(`Deleted list ${list.toLog()}`);
                if (useTrash) {
                }
                return true;
            } else {
                //remove trash relics
                await this.TrashItems.RemoveList(list);
                await this.Trash.RemoveList(list);
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * moves a listitem from storage to trash (if the user enabled it)
     * @param list list, the item is part of
     * @param item listitem to be moved
     * @returns deletion of the listitem and move to trash successful
     */
    private async removeListitemFromStorage(list: List, item: Listitem): Promise<boolean> {
        if (((await this.useListitemTrash()) == false || (await this.TrashItems.StoreListitem(item, list.Uuid))) && (await this.Listitems.RemoveItem(item))) {
            list.RemoveItem(item);
            await this.cleanOrderListitems(list);
            this.Popups.Toast.Success("service-lists.delete_item_success");
            Logger.Notice(`Deleted listitem ${item.toLog()}`);
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.delete_item_error");
            Logger.Error(`Could not remove listitem ${item.toLog()} from storage`);
            return false;
        }
    }

    /**
     * set new order numbers of list, depending on there position in array
     * @param lists lists to be ordered
     * @param force_event emit the list-dataset changed event
     * @returns reordered lists
     */
    private async cleanOrderLists(lists: List[], force_event: boolean = false): Promise<List[]> {
        let update = false;
        let order = 0;
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i];
            list.Order = order++;
            if (list.Dirty) {
                await this.StoreList(list);
                update = true;
            }
        }
        if (update || force_event) {
            this.onTrashDatasetChangedSubject.next(lists);
            Logger.Debug(`Changed list order of ${lists.length} lists`);
        }
        return lists;
    }

    /**
     * set new order numbers of listitems, depending on there position in array
     * @param list list, of which the items should be reordered
     * @returns list with reordered items
     */
    private async cleanOrderListitems(list: List): Promise<List> {
        let update = false;
        let order = 0;
        for (let i = 0; i < list.Items.length; i++) {
            const item = list.Items[i];
            item.Order = order++;
            if (item.Dirty) {
                update = true;
            }
            await this.storeListitem(item, list);
        }

        if (update) {
            list.Updated = Date.now();
            this.StoreList(list);
        }

        return list;
    }

    /**
     * move all listitems to trash (if the user enabled it)
     * @param list list, of which the items should be removed
     * @returns removal successful?
     */
    private async emptyList(list: List): Promise<boolean> {
        if (await this.useListitemTrash()) {
            //get all items of the list and move them to trash
            const items = await this.Listitems.GetItems(list);
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    await this.TrashItems.StoreListitem(items[i], list.Uuid);
                }
            } else {
                this.Popups.Toast.Error("service-lists.empty_error");
                return false;
            }
        }

        if (await this.Listitems.RemoveList(list)) {
            const item_count = list.ItemsCount;
            list.DeleteAllItems();
            await this.StoreList(list);
            this.Popups.Toast.Success("service-lists.empty_success");
            Logger.Notice(`Emptied list ${list.toLog()} with ${item_count} item(s)`);
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.empty_error");
            return false;
        }
    }

    /**
     * erases a list from storage permanently
     * @param list list to be erased
     * @returns erase successful
     */
    private async eraseListFromTrashStorage(list: List): Promise<boolean> {
        if (await this.Trash.RemoveList(list)) {
            await this.TrashItems.RemoveList(list);
            this.Popups.Toast.Success("service-lists.erase_success");
            this.onTrashDatasetChangedSubject.next(await this.GetTrash());
            Logger.Debug(`Erased list ${list.toLog()} from trash`);
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.erase_error");
            return false;
        }
    }

    /**
     * restore a list from trash
     * @param list list to be restored
     * @returns restore successful
     */
    private async restoreListFromTrash(list: List): Promise<boolean> {
        list.Order = await this.Lists.GetListsCount();
        list.Updated = Date.now();
        if (await this.StoreList(list, true)) {
            const items = await this.TrashItems.GetItems(list);
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if ((await this.storeListitem(item, list, true)) == false) {
                        Logger.Error(`Could not save restored listitem ${item.toLog()} of list ${list.toLog()} from trash`);
                        this.Popups.Toast.Error("service-lists.restore_error");
                        //remove relics
                        this.Lists.RemoveList(list);
                        this.Listitems.RemoveList(list);
                        return false;
                    }
                }
                this.Trash.RemoveList(list);
                this.TrashItems.RemoveList(list);
                this.onTrashDatasetChangedSubject.next(await this.GetTrash());
                this.onListsDatasetChangedSubject.next(await this.GetLists());
                Logger.Notice(`Restored list ${list.toLog()} from trash`);
                this.Popups.Toast.Success("service-lists.restore_success");
                return true;
            } else {
                Logger.Error(`Could not restore listitems of list ${list.toLog()} from trash`);
                this.Popups.Toast.Error("service-lists.restore_error");
                //remove relics
                this.Lists.RemoveList(list);
                this.Listitems.RemoveList(list);
                return false;
            }
        } else {
            Logger.Error(`Could not restore list ${list.toLog()} from trash`);
            this.Popups.Toast.Error("service-lists.restore_error");
            //remove relics
            this.Lists.RemoveList(list);
            return false;
        }
    }

    /**
     * finally erase an item from list trash
     * @param list list, the item was part of
     * @param item item in TRASH, to be deleted
     * @returns deletion successful?
     */
    private async eraseListitemFromTrash(list: List, item: Listitem): Promise<boolean> {
        if (await this.TrashItems.RemoveItem(item)) {
            this.Popups.Toast.Success("service-lists.erase_item_success");
            list.TrashItems = list.TrashItems.filter(el => el != item);
            Logger.Notice(`Erased listitem ${item.toLog()} from trash`);
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.erase_item_error");
            return false;
        }
    }

    /**
     * restore an list item from Trash
     * @param list list, the item should be restored to
     * @param item item in TRASH to be restored
     * @returns restore successful?
     */
    public async restoreListitemFromTrash(list: List, item: Listitem): Promise<boolean | undefined> {
        item.Order = await this.Listitems.GetItemsCount(list);
        if (await this.storeListitem(item, list, true)) {
            list.AddItem(item);
            await this.TrashItems.RemoveItem(item);
            list.TrashItems = list.TrashItems.filter(el => el != item);
            this.Popups.Toast.Success("service-lists.restore_item_success");
            Logger.Notice(`Restored listitem ${item.toLog()} from trash`);
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.restore_item_error");
            return false;
        }
    }

    /**
     * empty the lists trash
     * @returns empty successful?
     */
    private async emptyTrash(): Promise<boolean> {
        const trash = await this.GetTrash();
        let success: boolean = true;
        let count = 0;
        for (let i = 0; i < trash.length; i++) {
            const list = trash[i];
            if (await this.Trash.RemoveList(list)) {
                //remove all listitems
                await this.Listitems.RemoveList(list);
                //remove all listitems in the trash of the list
                await this.TrashItems.RemoveList(list);
                count++;
            } else {
                success = false;
            }
        }

        if (success) {
            this.Popups.Toast.Success("service-lists.empty_trash_success");
            Logger.Notice(`Emptied the trash with ${count} list(s)`);
        } else {
            this.Popups.Toast.Error("service-lists.empty_trash_error");
            Logger.Error(`Could not empty the trash completely, erased ${count} list(s)`);
        }

        this.onTrashDatasetChangedSubject.next(await this.GetTrash());
        return success;
    }

    /**
     * empty the listitem trash of a list
     * @param list list, the trash should be emptied
     * @returns empty successful?
     */
    private async emptyListitemTrash(list: List): Promise<boolean> {
        if (await this.TrashItems.RemoveList(list)) {
            list.TrashItems = [];
            this.Popups.Toast.Success("service-lists.empty_trash_success");
            return true;
        } else {
            this.Popups.Toast.Error("service-lists.empty_trash_error");
            Logger.Error(`Could not empty the trash of list ${list.toLog()}`);
            return false;
        }
    }

    /**
     * removes all lists and listitems in the trash, which were deleted a certain amount of seconds ago
     * @param seconds amount of secconds
     */
    private async removeOldTrashEntries(seconds: number) {
        const uuids = await this.Trash.removeOldEntries(seconds);
        for (let i = 0; i < uuids.length; i++) {
            await this.Listitems.RemoveListByUuid(uuids[i]);
            await this.TrashItems.RemoveListByUuid(uuids[i]);
        }

        await this.TrashItems.removeOldEntries(seconds);
    }

    /**
     * checks if there are more lists in the trash, than the limit allows
     */
    private async checkTrashLimit() {
        const limit = KeepInTrash.StockSize(this._keepInTrashStock);
        if (limit) {
            //check if list trash exceeds limit
            const uuids = await this.Trash.GetExcesses(limit);
            if (uuids.length > 0) {
                Logger.Debug(`Too many lists in trash, erasing ${uuids.length} list(s)`, uuids);
                for (let i = 0; i < uuids.length; i++) {
                    //erase list, listitems and listitems in trash
                    const list = uuids[i];
                    if (await this.Trash.RemoveList(list)) {
                        await this.TrashItems.RemoveListByUuid(list);
                        await this.Listitems.RemoveListByUuid(list);
                    } else {
                        Logger.Error(`Could not erase exceeded list uuid:${list} from trash`);
                    }
                }
            }
        }
    }

    /**
     * wishes the user to use the trash?
     */
    private async useTrash(): Promise<boolean> {
        return this.Preferences.Get<boolean>(EPrefProperty.TrashLists, true);
    }

    /**
     * wishes the user to use the trash for listitems?
     */
    private async useListitemTrash(): Promise<boolean> {
        return (await this.useTrash()) && (await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true));
    }
}

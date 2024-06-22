import { Injectable, WritableSignal, inject, signal } from "@angular/core";
import { Keyboard } from "@capacitor/keyboard";
import { ModalController, NavController } from "@ionic/angular/standalone";
import { Observable, Subscription, interval } from "rxjs";
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
import { ListitemsTrashProviderService } from "./listitems-trash-provider.service";
import { ListsProviderService } from "./lists-provider.service";
import { TrashProviderService } from "./trash-provider.service";

@Injectable({
    providedIn: "root",
})
export class ListsService {
    private readonly ListsProvider = inject(ListsProviderService);
    private readonly TrashProvider = inject(TrashProviderService);
    private readonly TrashItemsProvider = inject(ListitemsTrashProviderService);
    private readonly Preferences = inject(PreferencesService);
    private readonly ModalCtrl = inject(ModalController);
    private readonly Popups = inject(PopupsService);
    private readonly NavController = inject(NavController);
    private readonly Locale = inject(LocalizationService);

    private _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;
    private _removeOldTrashEntriesTimer?: Subscription;

    public readonly Lists: WritableSignal<List[]> = signal([]);
    private readonly _listIndex: Map<string, List> = new Map();

    public async Initialize() {
        this.KeepInTrashStock = await this.Preferences.Get<number>(EPrefProperty.TrashKeepinStock, this._keepInTrashStock);
        this.Preferences.onPrefChanged$.subscribe(arg => {
            if (arg.prop == EPrefProperty.TrashKeepinStock) {
                this.KeepInTrashStock = arg.value;
            }
        });
        await this.GetLists(true);
    }

    public get onTrashDatasetChanged$(): Observable<List[]> {
        return this.TrashProvider.ListsDatasetChangedSubject.asObservable();
    }

    public get onTrashItemsDatasetChanged$(): Observable<{ list: List; items: Listitem[] } | undefined> {
        return this.TrashItemsProvider.ListitemsDatasetChangedSubject.asObservable();
    }

    private set KeepInTrashStock(value: number | KeepInTrash.Enum) {
        value = KeepInTrash.FromNumber(value);
        this._keepInTrashStock = value;
        if (KeepInTrash.StockPeriod(value)) {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = interval(value * 60 * 60 * 24).subscribe(() => {
                this.TrashProvider.RemoveOldEntries(value);
            });
            this.TrashProvider.RemoveOldEntries(value);
        } else {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = undefined;
            this.limitEntryCount(KeepInTrash.StockSize(value));
        }
    }

    /**
     * get all lists with at least peek data from backend
     * @param reload force to reload lists from backend
     * @returns array of all lists
     */
    public async GetLists(reload: boolean = false): Promise<List[]> {
        if (reload || this.Lists().length == 0) {
            const lists = await this.ListsProvider.GetLists();
            this._listIndex.clear();
            lists.forEach(l => {
                this._listIndex.set(l.Uuid, l);
            });

            this.orderLists(lists);
        }
        return this.Lists();
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | undefined> {
        if (!this._listIndex.has(uuid) || this._listIndex.get(uuid)!.isPeek) {
            const list = await this.ListsProvider.GetList(uuid);
            if (list) {
                this.putListInIndex(list);
            }
        }

        return this._listIndex.get(uuid);
    }

    /**
     * opens the list editor to create a new list
     */
    public async NewList() {
        if (AppService.isMobileApp) {
            await Keyboard.show();
        }
        const listname = await ListEditor(this.ModalCtrl);
        if (listname) {
            const list = List.Create({ name: listname, uuid: await this.createUuid(), order: this._listIndex.size });
            if (await this.StoreList(list)) {
                Logger.Notice(`Created new list ${list.toLog()}`);
                this.putListInIndex(list);
                this.NavController.navigateForward(`/lists/items/${list.Uuid}`);
            } else {
                this.Popups.Toast.Error("service-lists.store_list_error");
            }
        }
    }

    /**
     * opens the list editor to edit the title of a list
     * @param list list to be edited
     */
    public async RenameList(list: List) {
        const listname = await ListEditor(this.ModalCtrl, { listname: list.Name, purpose: "edit" });
        if (listname) {
            list.Name = listname;
            if (await this.StoreList(list)) {
                Logger.Notice(`Renamed list ${list.toLog()}`);
                this.putListInIndex(list);
            } else {
                this.Popups.Toast.Error("service-lists.store_list_error");
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
                return this.removeList(list);
            } else {
                return undefined;
            }
        } else {
            return this.removeList(list);
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
        const obj = await ListItemEditor(this.ModalCtrl);
        if (obj) {
            const item = Listitem.Create(obj);
            list.AddItem(item);
            if (await this.StoreList(list)) {
                Logger.Debug(`Created new listitem ${item.toLog()}`);
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
        const obj = await ListItemEditor(this.ModalCtrl, { item: item.Item, note: item.Note, purpose: "edit" });
        if (obj) {
            item.fromInput(obj);
            if (await this.StoreList(list)) {
                Logger.Debug(`Edited listitem ${item.toLog()}`);
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
                return this.removeListitem(list, item);
            } else {
                return undefined;
            }
        } else {
            return this.removeListitem(list, item);
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
     * @param force empty the trash without prompt
     * @returns empty successfull, undefined if user canceled it
     */
    public async EmptyTrash(force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true))) {
            let text;
            const count = await this.TrashProvider.Count();
            if (count == 1) {
                text = this.Locale.getText("service-lists.empty_trash_confirm_single");
            } else {
                text = this.Locale.getText("service-lists.empty_trash_confirm", { count: count });
            }
            text += this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return (await this.emptyListsTrash()) > 0;
            } else {
                return undefined;
            }
        } else {
            return (await this.emptyListsTrash()) > 0;
        }
    }

    /**
     * removes all listitems from trash for a certain list
     * @param list the list, the items in trash should be removed
     * @returns removal successful? undefined if the user canceled it
     */
    public async EmptyListitemTrash(list: List): Promise<boolean | undefined> {
        //WIP: Arbeitsstand
        if (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true)) {
            let text;
            const count = await this.TrashProvider.CountItems(list);
            if (count == 1) {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm_single", { name: list.Name });
            } else {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm", { name: list.Name, count: count });
            }
            text += this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.TrashProvider.EraseListitem(list, undefined);
            } else {
                return undefined;
            }
        } else {
            return this.TrashProvider.EraseListitem(list, undefined);
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
     * creates a unique list id
     * @returns unique id
     */
    public async createUuid(): Promise<string> {
        let uuid = HelperUtils.createUUID(20);
        //check, if the uuid already exists for a list or in trash
        while ((await this.ListsProvider.Exists(uuid)) || (await this.TrashProvider.Exists(uuid))) {
            uuid = HelperUtils.createUUID(20);
        }
        return uuid;
    }

    /**
     * stores a list in backend up there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean> {
        if ((await this.ListsProvider.StoreList(list, force)) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * publish changes in a list with the signal
     * @param list list to be changed
     */
    private putListInIndex(list: List) {
        this._listIndex.set(list.Uuid, list);
        let lists = Array.from(this._listIndex.values());
        this.orderLists(lists);
    }

    /**
     * removes a list from the index and publish it with the signal
     * @param list list to be removed
     */
    private removeListInIndex(list: List) {
        if (this._listIndex.delete(list.Uuid)) {
            let lists = Array.from(this._listIndex.values());
            this.resetOrder(lists);
        }
    }

    /**
     * orders the lists by 'Order' property and publish the list with the signal
     * @param lists lists array to be ordered and set in Lists-signal
     */
    private orderLists(lists: List[]) {
        lists = lists.sort((a: List, b: List) => (a.Order > b.Order ? 1 : -1));
        this.Lists.set(lists);
    }

    /**
     * set the 'Order' property of all lists, as they are in the given list
     * @param lists list to reset the 'Order' property
     */
    private async resetOrder(lists: List[]) {
        let order = 0;
        let changed = false;
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i];
            list.Order = order++;
            if (list.Dirty) {
                changed = true;
                await this.StoreList(list);
            }
        }

        if (changed) {
            this.Lists.set(lists);
        }
    }

    /**
     * move list to trash or removes it completely
     * @param list list to be removed
     * @returns was the removal successful
     */
    private async removeList(list: List): Promise<boolean> {
        if (this._listIndex.has(list.Uuid)) {
            if (await this.ListsProvider.RemoveList(list)) {
                if ((await this.Preferences.Get<boolean>(EPrefProperty.TrashLists, true)) == true) {
                    list.Deleted = Date.now();
                    await this.TrashProvider.StoreList(list);
                } else {
                    //also remove all listitems in trash for this list
                    await this.TrashProvider.EraseLists(list);
                }

                this.removeListInIndex(list);
                return true;
            }
        }
        return false;
    }

    /**
     * deletes all listitems in the list
     * @param list list to be emptied
     * @returns was the list stored successful after emptying?
     */
    private async emptyList(list: List): Promise<boolean> {
        if (list.Items.length > 0) {
            if ((await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true)) == true) {
                const del = await this.TrashProvider.StoreListitems(list, list.Items);
                if (!del) {
                    Logger.Error(`Could not empty list ${list.toLog()} and move items to trash`);
                    return false;
                }
            }
            list.Items = [];
            if (await this.StoreList(list)) {
                this.Lists.set(this.Lists());
                return true;
            }
        }

        return false;
    }

    /**
     * removes a listitems from a list
     * @param list list, the item should be removed
     * @param item listitem to remove
     * @returns was the list stored successful after removal?
     */
    private async removeListitem(list: List, item: Listitem): Promise<boolean> {
        list.RemoveItem(item);
        return await this.StoreList(list);
    }

    /**
     * erases a listitem from trash
     * @param list list, the item should be erased
     * @param item listitem to be erased
     * @returns was the erase successful
     */
    private async eraseListitemFromTrash(list: List, item: Listitem): Promise<boolean> {
        return this.TrashProvider.EraseListitem(list, item);
    }

    /**
     * empties the trash
     * @returns was the erase successful
     */
    private async emptyListsTrash(): Promise<number> {
        const del = await this.TrashProvider.EraseLists(await this.TrashProvider.GetLists());
        if (del > 0) {
            Logger.Notice(`Erased ${del} list(s) from trash`);
        }

        return del;
    }

    private async limitEntryCount(maxcount?: number) {
        if (maxcount) {
            await this.TrashProvider.LimitEntryCount(maxcount);
            await this.TrashItemsProvider.LimitEntryCount(maxcount);
        }
    }
}

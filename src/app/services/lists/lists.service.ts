import { Injectable, WritableSignal, inject, signal } from "@angular/core";
import { Keyboard } from "@capacitor/keyboard";
import { AlertInput, ModalController, NavController } from "@ionic/angular/standalone";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { HelperUtils } from "../../classes/utils/helper-utils";
import { StringUtils } from "../../classes/utils/string-utils";
import { ListEditor } from "../../components/list-editor/list-editor.component";
import { ListItemEditor } from "../../components/list-item-editor/list-item-editor.component";
import { AppService } from "../app/app.service";
import { ConnectIQDevice } from "../connectiq/connect-iq-device";
import { ConnectIQService } from "../connectiq/connect-iq.service";
import { LocalizationService } from "../localization/localization.service";
import { Logger } from "../logging/logger";
import { PopupsService } from "../popups/popups.service";
import { Toast } from "../popups/toast";
import { ListsBackendService } from "../storage/lists/lists-backend.service";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { KeepInTrash } from "./keep-in-trash";
import { List } from "./list";
import { Listitem, ListitemModel } from "./listitem";
import { ListitemsTrashProvider } from "./listitems-trash-provider";
import { ListitemTrashModel, ListitemTrashUtils } from "./listitems-trash-utils";
import { ListsProvider } from "./lists-provider";
import { TrashProvider } from "./trash-provider";

@Injectable({
    providedIn: "root",
})
export class ListsService {
    private readonly ListsProvider: ListsProvider;
    private readonly TrashProvider: TrashProvider;
    private readonly TrashItemsProvider: ListitemsTrashProvider;
    private readonly Preferences = inject(PreferencesService);
    private readonly ModalCtrl = inject(ModalController);
    private readonly Popups = inject(PopupsService);
    private readonly NavController = inject(NavController);
    private readonly Locale = inject(LocalizationService);
    private readonly Backend = inject(ListsBackendService);
    private readonly ConnectIQ = inject(ConnectIQService);

    private _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;
    private _removeOldTrashEntriesTimer?: Subscription;

    public readonly Lists: WritableSignal<List[]> = signal([]);
    private readonly _listIndex: Map<string, List> = new Map();

    private onTrashItemsDatasetChangedSubject = new BehaviorSubject<ListitemTrashModel | undefined>(undefined);
    public onTrashItemsDatasetChanged$ = this.onTrashItemsDatasetChangedSubject.asObservable();

    private onTrashDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onTrashDatasetChanged$ = this.onTrashDatasetChangedSubject.asObservable();

    private onListChangedSubject = new BehaviorSubject<List | undefined>(undefined);
    public onListChanged$ = this.onListChangedSubject.asObservable();

    public constructor() {
        this.ListsProvider = new ListsProvider(this.Backend);
        this.TrashItemsProvider = new ListitemsTrashProvider(this.Backend, this.onTrashItemsDatasetChangedSubject);
        this.TrashProvider = new TrashProvider(this.Backend, this.TrashItemsProvider, this.onTrashDatasetChangedSubject);
    }

    public async Initialize() {
        this.KeepInTrashStock = await this.Preferences.Get<number>(EPrefProperty.TrashKeepinStock, this._keepInTrashStock);
        this.Preferences.onPrefChanged$.subscribe(arg => {
            if (arg.prop == EPrefProperty.TrashKeepinStock) {
                this.KeepInTrashStock = arg.value;
            }
        });
        const count = (await this.GetLists(true)).length;
        Logger.Debug(`Found ${count} list(s) in the backend`);
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
            this.TrashProvider.MaxEntryCount = undefined;
            this.TrashItemsProvider.MaxEntryCount = undefined;
        } else {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = undefined;
            this.TrashProvider.MaxEntryCount = KeepInTrash.StockSize(value);
            this.TrashItemsProvider.MaxEntryCount = KeepInTrash.StockSize(value);
        }
    }

    /**
     * get all lists with at least peek data from backend
     * @param reload force to reload lists from backend
     * @returns array of all lists
     */
    public async GetLists(reload: boolean = false): Promise<List[]> {
        if (reload || this.Lists().length == 0) {
            const lists = await this.ListsProvider.GetLists(true);
            this._listIndex.clear();
            lists.forEach(l => {
                this._listIndex.set(l.Uuid, l);
            });

            this.orderLists(lists);
        }
        return this.Lists();
    }

    /**
     * returns all lists in the trash
     * @returns array of lists in trash
     */
    public async GetTrash(): Promise<List[]> {
        return this.TrashProvider.GetLists(true);
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
     * returns the listitems in trash of a list
     * @param uuid unique identifier of the list
     * @returns ListitemTrashModel object
     */
    public async GetListitemTrash(uuid: string): Promise<ListitemTrashModel | undefined> {
        return this.TrashItemsProvider.GetListitemsTrash(uuid);
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
            const list = new List({ name: listname, uuid: await this.createUuid(), order: this._listIndex.size, created: Date.now() });
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
        const del_on_watch = await this.Preferences.Get(EPrefProperty.DeleteListOnDevice, false);
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmDeleteList, true))) {
            const checkbox: AlertInput = {
                label: this.Locale.getText("service-lists.delete_confirm_watch"),
                type: "checkbox",
                value: "del_on_watch",
                checked: del_on_watch,
            };
            const result = await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.delete_confirm", { name: StringUtils.shorten(list.Name, 40) }), inputs: [checkbox] });
            if (result !== false) {
                const del_on_watch = Array.isArray(result) && result.includes("del_on_watch") ? true : false;
                return this.removeList(list.Uuid, del_on_watch);
            } else {
                return undefined;
            }
        } else {
            return this.removeList(list.Uuid, del_on_watch);
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
            const item_id = await this.createUuid(list);
            const item = Listitem.Create({ uuid: item_id, item: obj.item, note: obj.note, order: list.Items.length, created: Date.now() });
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
     * @param trash trash of the list
     * @param item the item in Trash to be erased
     * @returns erase successful, undefined if user canceled it
     */
    public async EraseListitemFromTrash(trash: ListitemTrashModel, item: ListitemModel): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEraseListitem, true)) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.erase_item_confirm", { name: StringUtils.shorten(item.item, 40) }) })) {
                return this.eraseListitemFromTrash(trash, item);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListitemFromTrash(trash, item);
        }
    }

    /**
     * prompts the user to empty the lists trash
     * @param force empty the trash without prompt
     * @returns empty successfull, undefined if user canceled it
     */
    public async WipeTrash(force: boolean = false): Promise<boolean | undefined> {
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
                return (await this.wipeListsTrash()) > 0;
            } else {
                return undefined;
            }
        } else {
            return (await this.wipeListsTrash()) > 0;
        }
    }

    /**
     * removes all listitems from trash for a certain list
     * @param trash the list, the items in trash should be removed
     * @returns removal successful? undefined if the user canceled it
     */
    public async EmptyListitemTrash(trash: ListitemTrashModel): Promise<boolean | undefined> {
        if (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true)) {
            let text;
            if (trash.items.length == 1) {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm_single");
            } else {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm", { count: trash.items.length });
            }
            text += this.Locale.getText("service-lists.undo_warning");
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.emptyListitemTrash(trash);
            } else {
                return undefined;
            }
        } else {
            return this.emptyListitemTrash(trash);
        }
    }

    /**
     * corrects the order numbers of lists
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
    public async ReorderListitems(list: List, items: Listitem[], store: boolean = true): Promise<void> {
        list.Items = items;
        for (let i = 0; i < list.Items.length; i++) {
            list.Items[i].Order = i;
        }
        if (store) {
            await this.StoreList(list);
        }
    }

    /**
     * toggles the hidden state of a listitem
     * @param list list, the item is part of
     * @param item listitem, hiddenstate should be toggled
     */
    public async ToggleHiddenListitem(list: List, item: Listitem): Promise<void> {
        item.Hidden = !item.Hidden;
        await this.StoreList(list);
    }

    /**
     * lock the item, so it is not deleted when emptying the list
     * @param list list, the item is part of^
     * @param item listitem, that should be locked/unlocked
     */
    public async ToggleLockListitem(list: List, item: Listitem): Promise<void> {
        item.Locked = !item.Locked;
        await this.StoreList(list);
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
                return this.eraseListFromTrash(list.Uuid);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListFromTrash(list.Uuid);
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
                return this.restoreListFromTrash(list.Uuid);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListFromTrash(list.Uuid);
        }
    }

    /**
     * prompts the user to restore a list item
     * @param list list, to which the item should be restored
     * @param item item in TRASH to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListitemFromTrash(trash: ListitemTrashModel, item: ListitemModel): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmRestoreListitem, true)) {
            if (await this.Popups.Alert.YesNo({ message: this.Locale.getText("service-lists.restore_item_confirm", { name: StringUtils.shorten(item.item, 40) }) })) {
                return this.restoreListitemFromTrash(trash, item);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListitemFromTrash(trash, item);
        }
    }

    /**
     * creates a unique identifier for a list or listitem
     * @returns unique id
     */
    public async createUuid(list?: List): Promise<string> {
        let uuid = HelperUtils.createUUID(20);
        if (list) {
            //create an uuid for a listitem
            const trash = await this.TrashItemsProvider.GetListitemsTrash(list.Uuid);
            while (list.Items.some(i => i.Uuid === uuid) || trash?.items.some(i => i.uuid === uuid)) {
                uuid = HelperUtils.createUUID(20);
            }
        } else {
            //create an uuid for a list
            let uuid = HelperUtils.createUUID(20);
            while ((await this.ListsProvider.Exists(uuid)) || (await this.TrashProvider.Exists(uuid))) {
                uuid = HelperUtils.createUUID(20);
            }
        }
        return uuid;
    }

    /**
     * stores a list in backend up there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false, fire_event = true): Promise<boolean> {
        const store = await this.ListsProvider.StoreList(list, force);
        if (store !== false) {
            if (store === true && fire_event) {
                this.onListChangedSubject.next(list);
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * transfer a list to a device
     * @param list list to transfer (or the uuid)
     * @param device device to be transfered, if null the default device is used
     */
    public async TransferList(list?: List | string, device?: ConnectIQDevice | number): Promise<boolean> {
        if (typeof list === "string") {
            list = await this.GetList(list);
        }
        if (!list) {
            return false;
        }

        if (typeof device === "number") {
            device = await this.ConnectIQ.GetDevice(device);
        }

        if (!device) {
            device = await this.ConnectIQ.GetDefaultDevice({ btn_text: this.Locale.getText("service-lists.transmit_send_btn") });
        }

        if (device && device.State == "Ready") {
            const confirm = await this.Preferences.Get<boolean>(EPrefProperty.ConfirmTransmitList, true);
            const locale = this.Locale.getText(["service-lists.transmit_confirm", "yes", "no"], { device: device.Name });
            if (!confirm || (await this.Popups.Alert.YesNo({ message: locale["service-lists.transmit_confirm"], button_yes: locale["yes"], button_no: locale["no"] }))) {
                const toast = await this.Popups.Toast.Notice("service-lists.transmit_process", Toast.DURATION_INFINITE);
                AppService.AppToolbar?.ToggleProgressbar(true);
                const resp = await this.ConnectIQ.SendToDevice({ device: device, data: list.toDeviceObj() });
                toast.dismiss();
                AppService.AppToolbar?.ToggleProgressbar(false);
                if (resp !== false) {
                    Logger.Debug(`Transfered list ${list.toLog()} to device ${device.toLog()}`);
                    this.Popups.Toast.Success("service-lists.transmit_success");
                    if (await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, true)) {
                        this.ConnectIQ.openApp(device);
                    }
                    return true;
                } else {
                    this.Popups.Toast.Error("service-lists.transmit_error");
                    Logger.Debug(`Could not transfer list ${list.toLog()} to device ${device.toLog()}`);
                }
            } else {
                return true;
            }
        } else if (device) {
            Logger.Debug(`Could not transfer list ${list.toLog()} to device ${device.toLog()}: device is state ${device.State}`);
        } else {
            Logger.Debug(`Could not transfer list ${list.toLog()}, no device fould`);
        }
        this.Popups.Toast.Error("service-lists.transmit_error");
        return false;
    }

    /**
     * wipes all listitem trashes of all lists
     */
    public async WipeListitemTrashes(): Promise<void> {
        await this.TrashItemsProvider.WipeTrashes();
    }

    /**
     * purges all details of lists in memory
     */
    public PurgeListDetails() {
        this.Lists().forEach(l => {
            l.PurgeDetails();
        });
    }

    /**
     * returns the number of lists in trash
     * @returns number of lists in trash
     */
    public async GetTrashCount(): Promise<number> {
        return this.TrashProvider.Count();
    }

    /**
     * returns the number of lists with listitems in the trash
     * @returns number of lists
     */
    public async GetItemsTrashCount(): Promise<number> {
        return this.TrashItemsProvider.CountAll();
    }

    /**
     * return the size in bytes and number of files of the lists- and trash-backends
     * @returns object with size of the lists and trashes
     */
    public async BackendSize(): Promise<{ lists: { size: number; files: number }; trash: { size: number; files: number } }> {
        const lists = await this.ListsProvider.BackendSize();
        const trash = await this.TrashProvider.BackendSize();
        const itemtrash = await this.TrashItemsProvider.BackendSize();
        trash.size += itemtrash.size;
        trash.files += itemtrash.files;

        return { lists: lists, trash: trash };
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
     * @returns was the list removed successful
     */
    private removeListInIndex(list: List): boolean {
        if (this._listIndex.delete(list.Uuid)) {
            let lists = Array.from(this._listIndex.values());
            this.resetOrder(lists, true);
            return true;
        } else {
            return false;
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
     * @param force_event publish the list with the signal
     */
    private async resetOrder(lists: List[], force_event: boolean = false) {
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

        if (force_event || changed) {
            this.Lists.set(lists);
        }
    }

    /**
     * move list to trash or removes it completely
     * @param uuid unique identifier of the list to be removed
     * @returns was the removal successful
     */
    private async removeList(uuid: string, delete_on_watch: boolean = false): Promise<boolean> {
        if (this._listIndex.has(uuid)) {
            const list = await this.ListsProvider.GetList(uuid);
            if (list) {
                list.Deleted = Date.now();
                if ((await this.Preferences.Get<boolean>(EPrefProperty.TrashLists, true)) == false || (await this.TrashProvider.StoreList(list, true))) {
                    if (await this.ListsProvider.RemoveList(list)) {
                        this.removeListInIndex(list);
                        this.Popups.Toast.Success("service-lists.delete_success");
                        Logger.Notice(`Removed list ${list.toLog()}`);
                        if (delete_on_watch) {
                            this.ConnectIQ.SendToDevice({ device: undefined, data: { type: "dellist", uuid: uuid } });
                        }
                        return true;
                    }
                }
            }
            Logger.Error(`Could not remove list ${list?.toLog() ?? uuid}`);
        }
        this.Popups.Toast.Error("service-lists.delete_error");
        return false;
    }

    /**
     * deletes all listitems in the list
     * @param list list to be emptied
     * @returns was the list stored successful after emptying?
     */
    private async emptyList(list: List): Promise<boolean> {
        if (list.ItemsCount > 0) {
            if ((await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true)) == true) {
                const del = await this.TrashItemsProvider.StoreListitem(
                    list.Uuid,
                    list.Items.filter(i => !i.Locked),
                );
                if (!del) {
                    Logger.Error(`Could not empty list ${list.toLog()} and move items to trash`);
                    return false;
                }
            }
            await this.ReorderListitems(
                list,
                list.Items.filter(i => i.Locked),
                false,
            );
            if (await this.StoreList(list)) {
                this.putListInIndex(list);
                this.Popups.Toast.Success("service-lists.empty_success");
                return true;
            } else {
                this.Popups.Toast.Error("service_lists.empty_error");
                return false;
            }
        }

        return true;
    }

    /**
     * removes a listitems from a list
     * @param list list, the item should be removed
     * @param item listitem to remove
     * @returns was the list stored successful after removal?
     */
    private async removeListitem(list: List, item: Listitem): Promise<boolean> {
        if (!(await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true)) || (await this.TrashItemsProvider.StoreListitem(list.Uuid, item))) {
            list.RemoveItem(item);
            return await this.StoreList(list);
        } else {
            return false;
        }
    }

    /**
     * erases a listitem from trash
     * @param trash trash of the list, the item should be erased
     * @param item listitem to be erased
     * @returns was the erase successful
     */
    private async eraseListitemFromTrash(trash: ListitemTrashModel, item: ListitemModel): Promise<boolean> {
        return this.TrashItemsProvider.EraseListitem(trash, item);
    }

    /**
     * empties the trash
     * @returns was the erase successful
     */
    private async wipeListsTrash(): Promise<number> {
        const del = await this.TrashProvider.WipeTrash();
        if (del > 0) {
            Logger.Notice(`Erased ${del} list(s) from trash`);
        }

        return del;
    }

    /**
     * empties the listitem trash for a list
     * @param list list to empty
     * @returns was the emptying successful?
     */
    private async emptyListitemTrash(trash: ListitemTrashModel): Promise<boolean> {
        return this.TrashItemsProvider.EraseListitemTrash(trash);
    }

    /**
     * restores a list from trash
     * @param list list to restore
     * @returns was the restore successful
     */
    private async restoreListFromTrash(uuid: string): Promise<boolean> {
        //Read list from trash backend
        const list = await this.TrashProvider.GetList(uuid);
        if (list) {
            //move it to the end...
            list.Order = this.Lists().length;

            if (await this.ListsProvider.StoreList(list, true)) {
                if (await this.TrashProvider.EraseLists(list.Uuid, false)) {
                    Logger.Notice(`Restored list ${list.toLog()} from trash`);
                } else {
                    Logger.Error(`Restored list ${list.toLog()} from trash, but could not erase it from trash`);
                }
                this.Popups.Toast.Success("service-lists.restore_success");

                this.putListInIndex(list);
                return true;
            }
        }
        Logger.Error(`Could not restore list ${list?.toLog() ?? "uuid:" + uuid} from trash`);
        return false;
    }

    /**
     * restores a listitem from the trash of a list
     * @param trash trash of the list
     * @param item listitem to restore
     * @returns was the restore successful
     */
    private async restoreListitemFromTrash(trash: ListitemTrashModel, item: ListitemModel): Promise<boolean> {
        const list = await this.GetList(trash.uuid);
        if (list) {
            if (list.Items.some(i => i.Uuid == item.uuid)) {
                item.uuid = await this.createUuid(list);
            }
            list.AddItem(item);

            if (await this.ListsProvider.StoreList(list)) {
                await this.TrashItemsProvider.EraseListitem(trash, item);
                Logger.Debug(`Restored listitem ${ListitemTrashUtils.toLog(item)} from trash of list ${ListitemTrashUtils.toLog(trash)}`);
                return true;
            }
        }
        Logger.Error(`Could not restore listitem ${ListitemTrashUtils.toLog(item)} from trash of list ${ListitemTrashUtils.toLog(trash)}`);
        return false;
    }

    /**
     * erases a list from trash
     * @param uuid unique identifier of the list
     */
    private async eraseListFromTrash(uuid: string): Promise<boolean> {
        return (await this.TrashProvider.EraseLists(uuid)) > 0;
    }

    /**
     * set new order numbers of list, depending on there position in the array
     * @param lists lists to be ordered
     * @returns reordered lists
     */
    private async cleanOrderLists(lists: List[]): Promise<List[]> {
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
        if (update) {
            this.Lists.set(lists);
        }
        return lists;
    }
}

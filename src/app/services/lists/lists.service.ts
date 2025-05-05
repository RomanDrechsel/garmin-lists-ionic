import { inject, Injectable } from "@angular/core";
import { Keyboard } from "@capacitor/keyboard";
import { AlertInput, ModalController, NavController } from "@ionic/angular/standalone";
import { BehaviorSubject, interval, type Subscription } from "rxjs";
import { StringUtils } from "src/app/classes/utils/string-utils";
import { ListEditor } from "src/app/components/list-editor/list-editor.component";
import { ListItemEditor, ListItemEditorMultiple } from "src/app/components/list-item-editor/list-item-editor.component";
import { AppService } from "../app/app.service";
import type { ConnectIQDevice } from "../connectiq/connect-iq-device";
import { ConnectIQMessageType } from "../connectiq/connect-iq-message-type";
import { ConnectIQService } from "../connectiq/connect-iq.service";
import { LocalizationService } from "../localization/localization.service";
import { Logger } from "../logging/logger";
import { PopupsService } from "../popups/popups.service";
import { Toast } from "../popups/toast";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { type ListsOrder, type ListsOrderDirection } from "../storage/sqlite/sqlite-backend.service";
import { SqliteBackendService } from "./../storage/sqlite/sqlite-backend.service";
import { KeepInTrash } from "./keep-in-trash";
import { List, type ListReset } from "./list";
import { Listitem } from "./listitem";

@Injectable({
    providedIn: "root",
})
export class ListsService {
    private readonly Preferences = inject(PreferencesService);
    private readonly ModalCtrl = inject(ModalController);
    private readonly Popups = inject(PopupsService);
    private readonly NavController = inject(NavController);
    private readonly Locale = inject(LocalizationService);
    private readonly ConnectIQ = inject(ConnectIQService);
    private readonly BackendService = inject(SqliteBackendService);

    private _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;
    private _syncLists: boolean = false;
    private _removeOldTrashEntriesTimer?: Subscription;
    private readonly _listIndex: Map<number, List> = new Map();

    private onTrashItemsDatasetChangedSubject = new BehaviorSubject<{ trash: List | undefined; trashItems: Listitem[] | undefined } | undefined>(undefined);
    public onTrashItemsDatasetChanged$ = this.onTrashItemsDatasetChangedSubject.asObservable();

    private onTrashDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onTrashDatasetChanged$ = this.onTrashDatasetChangedSubject.asObservable();

    private onListChangedSubject = new BehaviorSubject<List | undefined>(undefined);
    public onListChanged$ = this.onListChangedSubject.asObservable();

    private onListsChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onListsChanged$ = this.onListsChangedSubject.asObservable();

    public async Initialize() {
        await this.BackendService.Initialize();
        this._syncLists = await this.Preferences.Get<boolean>(EPrefProperty.SyncListOnDevice, false);
        this.Preferences.onPrefChanged$.subscribe(arg => {
            if (arg.prop == EPrefProperty.TrashKeepinStock) {
                this.removeOldTrash(arg.value);
            } else if (arg.prop == EPrefProperty.SyncListOnDevice) {
                this._syncLists = arg.value;
            }
        });
        await this.removeOldTrash(await this.Preferences.Get<number>(EPrefProperty.TrashKeepinStock, this._keepInTrashStock));
    }

    /**
     * get all lists with at least peek data from backend
     * @param reload force to reload lists from backend
     * @returns array of all lists
     */
    public async GetLists(args?: { orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<List[]> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        const lists = await this.BackendService.queryLists({ peek: true, trash: false, orderBy: args?.orderBy, orderDir: args?.orderDir });
        lists.forEach(l => {
            const list = this._listIndex.get(l.Uuid!);
            if (list) {
                list.copy(l);
            } else {
                this._listIndex.set(l.Uuid!, l);
            }
        });
        Array.from(this._listIndex.keys()).forEach(uuid => {
            if (!lists.some(l => l.Uuid == uuid)) {
                this._listIndex.delete(uuid);
            }
        });

        AppService.AppToolbar?.ToggleProgressbar(false);
        return lists;
    }

    /**
     * returns all lists in the trash
     * @returns array of lists in trash
     */
    public async GetTrash(): Promise<List[]> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        const trash = await this.BackendService.queryLists({ peek: true, trash: true, orderBy: "deleted", orderDir: "desc" });
        AppService.AppToolbar?.ToggleProgressbar(false);
        return trash;
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: number): Promise<List | undefined> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        const list = await this.BackendService.queryList(uuid);
        if (list) {
            const index = this._listIndex.get(list.Uuid!);
            if (index) {
                index.copy(list);
            }
        } else {
            this._listIndex.delete(uuid);
        }
        AppService.AppToolbar?.ToggleProgressbar(false);

        return this._listIndex.get(uuid);
    }

    /**
     * returns the listitems in trash of a list
     * @param uuid unique identifier of the list
     * @returns ListitemTrashModel object
     */
    public async GetListitemTrash(uuid: number | List): Promise<Listitem[] | undefined> {
        AppService.AppToolbar?.ToggleProgressbar(false);
        const trash = await this.BackendService.queryListitems({ list: uuid, trash: true, orderBy: "deleted", orderDir: "desc" });
        AppService.AppToolbar?.ToggleProgressbar(false);
        return trash;
    }

    /**
     * opens the list editor to create a new list
     */
    public async NewList() {
        const list = await ListEditor(this.ModalCtrl, {});
        if (list) {
            if (await this.StoreList(list)) {
                Logger.Notice(`Created new list ${list.toLog()}`);
                await this.addListToIndex(list);
                await this.cleanOrderLists();
                this.NavController.navigateForward(`/lists/items/${list.Uuid}`, { queryParams: { created: true } });
            } else {
                this.Popups.Toast.Error("service-lists.store_list_error");
            }
        }
    }

    /**
     * opens the list editor to edit the list
     * @param list list to be edited
     * @param only_title if true, only the title will be edited
     * @returns true if the list was edited and stored, false is storage failed. undefined if no changes were made
     */
    public async EditList(list: List): Promise<boolean | undefined> {
        const ret = await ListEditor(this.ModalCtrl, { list: list });
        if (ret) {
            const store = await this.StoreList(list);
            if (store === true) {
                Logger.Notice(`Edited list ${list.toLog()}`);
            } else if (store === false) {
                this.Popups.Toast.Error("service-lists.store_list_error");
            }
            return store;
        }
        return undefined;
    }

    /**
     * prompts the user to delete a list
     * @param lists list to be deleted
     * @param force delete the list without prompt
     * @returns list deletion successful? undefined if the user canceled it
     */
    public async DeleteList(lists: List | List[], force: boolean = false): Promise<boolean | undefined> {
        const del_on_watch = await this.Preferences.Get(EPrefProperty.DeleteListOnDevice, false);
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmDeleteList, true))) {
            let text = "";
            if (Array.isArray(lists) && lists.length > 1) {
                text = this.Locale.getText("service-lists.delete_confirm_plural");
            } else {
                text = this.Locale.getText("service-lists.delete_confirm", { name: StringUtils.shorten(Array.isArray(lists) ? lists[0].Name : lists.Name, 40) });
            }

            const checkbox: AlertInput = {
                label: this.Locale.getText("service-lists.delete_confirm_watch"),
                type: "checkbox",
                value: "del_on_watch",
                checked: del_on_watch,
            };
            const result = await this.Popups.Alert.YesNo({ message: text, inputs: [checkbox] });
            if (result !== false) {
                const del_on_watch = Array.isArray(result) && result.includes("del_on_watch") ? true : false;
                return this.removeLists(lists, del_on_watch);
            } else {
                return undefined;
            }
        } else {
            return this.removeLists(lists, del_on_watch);
        }
    }

    /**
     * prompts the user to delete all items of a list
     * @param lists list to be emptied
     * @param force empty the list without prompt
     * @returns deletion successful? undefined if user canceled it
     */
    public async EmptyList(lists: List | List[], force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEmptyList, true))) {
            let text = "";
            if (Array.isArray(lists) && lists.length > 1) {
                text = this.Locale.getText("service-lists.empty_confirm_plural");
            } else {
                text = this.Locale.getText("service-lists.empty_confirm", { name: StringUtils.shorten(Array.isArray(lists) ? lists[0].Name : lists.Name, 40) });
            }

            if (await this.Popups.Alert.YesNo({ message: text })) {
                return await this.emptyLists(lists);
            } else {
                return undefined;
            }
        } else {
            return await this.emptyLists(lists);
        }
    }

    /**
     * reorder the lists
     * @param lists
     */
    public async ReorderLists(lists: List[]): Promise<void> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        for (let i = 0; i < lists.length - 1; ++i) {
            lists[i].Order = i;
            await this.StoreList(lists[i], false, false, false);
        }
        AppService.AppToolbar?.ToggleProgressbar(false);
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
        let added: boolean | undefined = undefined;
        await ListItemEditorMultiple(this.ModalCtrl, {
            list: list,
            onAddItem: async (list: List, item: Listitem, add_more: boolean) => {
                if (item) {
                    list.AddItem(item);
                }
                if (added !== false) {
                    added = await this.StoreList(list, false, true, false);
                    if (add_more) {
                        if (added) {
                            this.Popups.Toast.Success("service-lists.add_moreitems_success", undefined, true);
                        } else {
                            this.Popups.Toast.Error("service-lists.add_moreitems_error", undefined, true);
                        }
                    }
                }
            },
        });
        return added;
    }

    /**
     * adds an already created item to a list
     * @param list list, the item sould be part of
     * @param args information about listitem to be added
     * @returns item-adding successful?
     */
    public async AddNewListitem(list: List, args: { item: string; order?: number; locked?: boolean; hidden?: boolean }): Promise<boolean> {
        if (!list || !args) {
            return false;
        }
        list.AddItem({ item: args.item, order: args.order ?? -1, locked: args.locked, hidden: args.hidden, created: Date.now() });
        if (await this.StoreList(list, false, true, true)) {
            this.onListsChangedSubject.next(await this.GetLists());
            return true;
        }

        return false;
    }

    /**
     * opens the listitem editor to edit an item
     * @param list list, the item is part of
     * @param item item to be edited
     * @returns editing successful? undefined if user canceled it
     */
    public async EditListitem(list: List, item: Listitem): Promise<boolean | undefined> {
        const obj = await ListItemEditor(this.ModalCtrl, { list: list, item: item });
        if (obj) {
            if (await this.StoreList(list, undefined, true, false)) {
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
     * @param list list, the item(s) are part of
     * @param items item(s) to be deleted
     * @param force delete the listitem without prompting
     * @returns deletion successful? undefined if user canceled it
     */
    public async DeleteListitem(list: List, items: Listitem | Listitem[], force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmDeleteListitem, true))) {
            let text = "";
            if (Array.isArray(items) && items.length > 1) {
                text = this.Locale.getText("service-lists.delete_item_confirm_plural");
            } else {
                text = this.Locale.getText("service-lists.delete_item_confirm", { name: StringUtils.shorten(Array.isArray(items) ? items[0].Item : items.Item, 40) });
            }
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.removeListitem(list, items);
            } else {
                return undefined;
            }
        } else {
            return this.removeListitem(list, items);
        }
    }

    /**
     * prompts the user to finally erase a listitem from trash
     * @param trash trash of the list
     * @param items the item in Trash to be erased
     * @returns erase successful, undefined if user canceled it
     */
    public async EraseListitemFromTrash(trash: List, items: Listitem | Listitem[]): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEraseListitem, true)) {
            let text = "";
            if (Array.isArray(items) && items.length > 1) {
                text = this.Locale.getText("service-lists.erase_item_confirm_plural");
            } else {
                text = this.Locale.getText("service-lists.erase_item_confirm", { name: StringUtils.shorten(Array.isArray(items) ? items[0].Item : items.Item, 40) });
            }
            text += this.Locale.getText("service-lists.undo_warning");

            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.eraseListitemFromTrash(trash, items);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListitemFromTrash(trash, items);
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
            const count = await this.BackendService.queryListsCount({ trash: true });
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

    public async WipeListitemTrash(list?: List, force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true))) {
            const count = await this.BackendService.queryListitemsCount({ list: list, trash: true });
            if (
                count > 0 &&
                (await this.Popups.Alert.YesNo({
                    message: "page_settings_trash.confirm_clearitemstrash",
                    button_yes: "page_settings_trash.confirm_clearitemstrash_ok",
                    button_no: "page_settings_trash.confirm_clearitemstrash_cancel",
                    translate: true,
                }))
            ) {
                return (await this.wipeListitemTrash(list)) > 0;
            }
            return undefined;
        } else {
            return (await this.wipeListitemTrash(list)) > 0;
        }
    }

    /**
     * removes all listitems from trash for a certain list
     * @param trash the list, the items in trash should be removed
     * @returns removal successful? undefined if the user canceled it
     */
    public async EmptyListitemTrash(trash: List): Promise<boolean | undefined> {
        if (await this.Preferences.Get(EPrefProperty.ConfirmEmptyTrash, true)) {
            let text;
            if (trash.TrashItemsCount == 1) {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm_single");
            } else {
                text = this.Locale.getText("service-lists.empty_trash_listitems_confirm", { count: trash.TrashItemsCount });
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
     * toggles the hidden state of a listitem
     * @param list list, the item is part of
     * @param items listitem, hiddenstate should be toggled
     * @param hide hide/show the listitem(s), if undefined the state is toggled
     */
    public async ToggleHiddenListitem(list: List, items: Listitem | Listitem[], hide: boolean | undefined = undefined): Promise<boolean | undefined> {
        if (!Array.isArray(items)) {
            items = [items];
        }
        items.forEach(item => {
            if (hide === undefined) {
                item.Hidden = !item.Hidden;
            } else {
                item.Hidden = hide;
            }
        });
        return await this.StoreList(list, undefined, undefined, false);
    }

    /**
     * lock the item, so it is not deleted when emptying the list
     * @param list list, the item is part of^
     * @param items listitem(s), that should be locked/unlocked
     * @param pin lock/unlock the listitem(s), if undefined, the state is toggled
     */
    public async ToggleLockListitem(list: List, items: Listitem | Listitem[], pin: boolean | undefined = undefined): Promise<boolean | undefined> {
        if (!Array.isArray(items)) {
            items = [items];
        }
        items.forEach(item => {
            if (pin === undefined) {
                item.Locked = !item.Locked;
            } else {
                item.Locked = pin;
            }
        });
        return await this.StoreList(list, undefined, undefined, false);
    }

    /**
     * prompts the user to erase a list from trash
     * @param list list to be erased
     * @param force erase the list without user prompt
     * @returns erase successful? undefined if user canceled it
     */
    public async EraseListFromTrash(lists: List | List[], force: boolean = false): Promise<boolean | undefined> {
        if (!force && (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmEraseList, true))) {
            let text = this.Locale.getText("service-lists.undo_warning");
            if (!Array.isArray(lists) || lists.length == 1) {
                text = this.Locale.getText("service-lists.erase_confirm", { name: StringUtils.shorten(Array.isArray(lists) ? lists[0].Name : lists.Name, 40) }) + text;
            } else {
                text = this.Locale.getText("service-lists.erase_confirm_plural") + text;
            }

            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.eraseListFromTrash(lists);
            } else {
                return undefined;
            }
        } else {
            return this.eraseListFromTrash(lists);
        }
    }

    /**
     * prompts the user to restore a list from trash
     * @param lists list(s) to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListFromTrash(lists: List | List[]): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmRestoreList, true)) {
            let text = "";
            if (!Array.isArray(lists) || lists.length == 1) {
                text = this.Locale.getText("service-lists.restore_confirm", { name: StringUtils.shorten(Array.isArray(lists) ? lists[0].Name : lists.Name, 40) });
            } else {
                text = this.Locale.getText("service-lists.restore_confirm_plural");
            }
            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.restoreListFromTrash(lists);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListFromTrash(lists);
        }
    }

    /**
     * prompts the user to restore a list item
     * @param trash list, to which the item should be restored
     * @param items item(s) in trash to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListitemFromTrash(trash: List, items: Listitem | Listitem[]): Promise<boolean | undefined> {
        if (await this.Preferences.Get<boolean>(EPrefProperty.ConfirmRestoreListitem, true)) {
            let text = "";
            if (!Array.isArray(items) || items.length == 1) {
                text = this.Locale.getText("service-lists.restore_item_confirm", { name: StringUtils.shorten(Array.isArray(items) ? items[0].Item : items.Item, 40) });
            } else {
                text = this.Locale.getText("service-lists.restore_item_confirm_plural");
            }

            if (await this.Popups.Alert.YesNo({ message: text })) {
                return this.restoreListitemFromTrash(trash, items);
            } else {
                return undefined;
            }
        } else {
            return this.restoreListitemFromTrash(trash, items);
        }
    }

    /**
     * stores a list in backend up there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful, undefined if no storage was needed
     */
    public async StoreList(list: List, force: boolean = false, fire_event: boolean = true, progressbar: boolean = true): Promise<boolean | undefined> {
        if (progressbar) {
            AppService.AppToolbar?.ToggleProgressbar(true);
        }
        let store: boolean | undefined;
        await this.cleanOrderListitems(list, false);
        if (!list.Uuid || list.Dirty || force) {
            const uuid = await this.BackendService.storeList({ list: list, force: force });
            if (uuid) {
                list.Uuid = uuid;
                list.Clean();
                store = true;
            } else {
                store = false;
            }
        }

        if (store) {
            if (fire_event) {
                this.onListChangedSubject.next(list);
            }
            if (store !== undefined) {
                //only sync, if the list was dirty
                this.syncListToWatch(list);
            }
        }

        if (progressbar) {
            AppService.AppToolbar?.ToggleProgressbar(false);
        }

        return store;
    }

    /**
     * transfer a list to a device
     * @param lists list to transfer (or the uuid)
     * @param device device to be transfered, if null the default device is used
     */
    public async TransferList(lists?: List | List[] | string | number, device?: ConnectIQDevice | number): Promise<boolean | undefined> {
        if (typeof lists == "string") {
            lists = parseInt(lists, 10);
        }
        if (typeof lists === "number") {
            lists = await this.GetList(lists);
        }

        if (!lists) {
            return false;
        }

        if (!Array.isArray(lists)) {
            lists = [lists];
        }

        if (typeof device === "number") {
            device = await this.ConnectIQ.GetDevice(device);
        }

        if (!device) {
            device = await this.ConnectIQ.GetDefaultDevice({ btn_text: this.Locale.getText("service-lists.transmit_send_btn") });
        }

        if (device && device.State == "Ready") {
            const text_key = lists.length > 1 ? "service-lists.transmit_confirm_plural" : "service-lists.transmit_confirm";
            const confirm = await this.Preferences.Get<boolean>(EPrefProperty.ConfirmTransmitList, true);
            const locale = this.Locale.getText([text_key, "yes", "no"], { device: device.Name });
            if (!confirm || (await this.Popups.Alert.YesNo({ message: locale[text_key], button_yes: locale["yes"], button_no: locale["no"] }))) {
                const toast = await this.Popups.Toast.Notice(lists.length == 1 ? "service-lists.transmit_process" : "service-lists.transmit_process_plural", Toast.DURATION_INFINITE);
                AppService.AppToolbar?.ToggleProgressbar(true);

                let errors = 0;
                for (let i = 0; i < lists.length; ++i) {
                    if (device && device.State == "Ready") {
                        const l = lists[i];
                        const payload = l.toDeviceObject();
                        const resp = await this.ConnectIQ.SendToDevice({ device: device, messageType: ConnectIQMessageType.List, data: payload });

                        if (resp !== false) {
                            Logger.Debug(`Transfered list ${l.toLog()} to device ${device.toLog()}`);
                            continue;
                        }
                    }
                    errors++;
                    Logger.Debug(`Could not transfer list ${lists[i].toLog()} to device ${device.toLog()}`);
                }
                toast.dismiss();
                AppService.AppToolbar?.ToggleProgressbar(false);

                if (errors > 0) {
                    if (lists.length == 1) {
                        this.Popups.Toast.Error("service-lists.transmit_error");
                    } else if (errors == lists.length) {
                        this.Popups.Toast.Error("service-lists.transmit_error_plural");
                    } else {
                        this.Popups.Toast.Error("service-lists.transmit_error_partial");
                    }
                    return false;
                } else {
                    if (lists.length == 1) {
                        this.Popups.Toast.Success("service-lists.transmit_success");
                    } else {
                        this.Popups.Toast.Success("service-lists.transmit_success_plural");
                    }
                    if (await this.Preferences.Get<boolean>(EPrefProperty.OpenAppOnTransmit, false)) {
                        this.ConnectIQ.openApp(device);
                    }
                    return true;
                }
            } else {
                return undefined;
            }
        } else if (device) {
            Logger.Debug(`Could not transfer list ${lists.length} list(s) to device ${device.toLog()}: device is state ${device.State}`);
        } else {
            Logger.Debug(`Could not transfer list ${lists.length} list(s), no device fould`);
        }
        if (lists.length == 1) {
            this.Popups.Toast.Error("service-lists.transmit_error");
        } else {
            this.Popups.Toast.Error("service-lists.transmit_error_plural");
        }
        return false;
    }

    /**
     * purges all details of lists in memory
     */
    public PurgeListDetails() {
        this._listIndex.forEach(l => {
            l.PurgeDetails();
        });
    }

    /**
     * returns the number of lists in trash
     * @returns number of lists in trash
     */
    public async GetTrashCount(): Promise<number> {
        return this.BackendService.queryListsCount({ trash: true });
    }

    /**
     * return the number of listitems in the trash of a list
     * @param list the list
     * @returns number of listitems in trash
     */
    public async GetTrashitemsCount(list?: List): Promise<number> {
        return this.BackendService.queryListitemsCount({ list: list, trash: true });
    }

    /**
     * return the size in bytes and number of files of the lists- and trash-backends
     * @returns object with size of the lists and trashes
     */
    public async BackendSize(): Promise<{ lists: { size: number; files: number }; trash: { size: number; files: number } }> {
        //TODO: ListsService.BackendSize()
        return { lists: { size: -1, files: -1 }, trash: { size: -1, files: -1 } };
    }

    /**
     * remove automatic synchronization from all lists
     */
    public async PurgeAllSyncs(): Promise<void> {
        const lists = await this.GetLists();
        for (let i = 0; i < lists.length; i++) {
            lists[i].Sync = false;
            await this.StoreList(lists[i], false, true, false);
        }
        const trash = await this.GetTrash();
        for (let i = 0; i < trash.length; i++) {
            trash[i].Sync = false;
            await this.StoreList(trash[i], false, true, false);
        }
        Logger.Debug(`Removed automatic synchronization of all lists`);
    }

    public async createNewList(args: { name: string; order?: number; sync?: boolean; reset?: ListReset }): Promise<List> {
        return new List({
            name: args.name,
            order: args.order ?? (await this.BackendService.getNextListOrder()),
            created: Date.now(),
            sync: args.sync,
            reset: args.reset,
            items: [],
        });
    }

    public async createNewListitem(list: List | number, args: { item: string; note?: string; order?: number; hidden?: boolean; locked?: boolean }): Promise<Listitem> {
        return new Listitem({
            item: args.item,
            note: args.note,
            order: args.order ?? (await this.BackendService.getNextListitemOrder({ list: list })),
            created: Date.now(),
            hidden: args.hidden,
            locked: args.locked,
        });
    }

    /**
     * sync a list to the watch
     * @param obj config for list sync
     */
    public async SyncList(obj: { list: List | number; only_if_definitive_device?: boolean; force_if_sync_is_disabled?: boolean }): Promise<void> {
        const list_to_sync = obj.list instanceof List ? obj.list : await this.GetList(obj.list);
        if (!list_to_sync) {
            Logger.Error(`Could not sync list ${obj.list} to watch, does not exist`);
            return;
        }
        return this.syncListToWatch(list_to_sync, obj.only_if_definitive_device, obj.force_if_sync_is_disabled);
    }

    private async addListToIndex(list: List) {
        if (!list.Uuid) {
            await this.StoreList(list, true, true, true);
        }
        if (list.Uuid) {
            this._listIndex.set(list.Uuid, list);
        } else {
            Logger.Error(`Could not store list ${list.toLog()} in index, no Uuid`);
        }
    }

    /**
     * sync changes to a list to the watch
     * @param list List to be synced
     * @param only_if_definitive_device only sync list, if the device is unambiguous
     * @param force_in_sync_is_disabled force sync even if list-sync is disabled
     */
    private async syncListToWatch(list: List, only_if_definitive_device: boolean = false, force_in_sync_is_disabled: boolean = false): Promise<void> {
        if ((!this._syncLists || !list.Sync) && !force_in_sync_is_disabled) {
            return;
        }

        const device = await this.ConnectIQ.GetDefaultDevice({ only_ready: true, select_device_if_undefined: !only_if_definitive_device });
        if (device) {
            if (list.isPeek && list.Uuid) {
                list.copyDetails(await this.GetList(list.Uuid));
            }
            var payload = list.toDeviceObject();
            if (!payload) {
                Logger.Error(`Could not sync new list to watch, list serialization failed`);
                return;
            }
            payload = ["issync", ...payload];

            if (await this.ConnectIQ.SendToDevice({ device: device, messageType: ConnectIQMessageType.List, data: payload })) {
                Logger.Debug(`Sync list ${list.toLog()} to watch ${device.toLog()}`);
            } else {
                Logger.Error(`Failed to sync list ${list.toLog()} to watch ${device.toLog()}`);
            }
        } else {
            Logger.Notice(`Could not sync list to watch, no default device`);
        }
    }

    /**
     * set the 'Order' property of all lists, as they are in the given list
     * @param lists list to reset the 'Order' property
     * @param force_event publish the list with the signal
     */
    private async cleanOrderLists(force_event: boolean = false, fire_event: boolean = true) {
        let order = 0;
        let changed = false;
        let lists = Array.from(this._listIndex.values());
        lists = lists.sort((a: List, b: List) => a.Order - b.Order);
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i];
            list.Order = order++;
            if (list.Dirty) {
                changed = true;
                await this.StoreList(list, false, false, false);
            }
        }

        if (fire_event && (force_event || changed)) {
            this.onListsChangedSubject.next(await this.GetLists());
        }
    }

    /**
     * correct the order numbers of listitems
     * @param list list, the items are part of
     * @param items items to be ordered
     * @returns list with reordered listitems
     */
    private async cleanOrderListitems(list: List, store: boolean = true): Promise<void> {
        list.cleanItemsOrder();
        if (store) {
            await this.StoreList(list);
        }
    }

    /**
     * move list to trash or removes it completely
     * @param lists list(s) to remove
     * @param delete_on_watch if the list should be deleted on watch
     * @returns was the removal successful
     */
    private async removeLists(lists: List | List[], delete_on_watch: boolean = false): Promise<boolean> {
        if (!Array.isArray(lists)) {
            lists = [lists];
        }
        if (lists.length == 0) {
            return true;
        }

        AppService.AppToolbar?.ToggleProgressbar(true);
        //TODO: Refactor -> all in one query

        const use_trash = await this.Preferences.Get<boolean>(EPrefProperty.TrashLists, true);
        let errors = 0;
        let deleted = 0;
        for (let i = 0; i < lists.length; i++) {
            const list: List | undefined = lists[i];
            if (list && list.Uuid && this._listIndex.has(list.Uuid)) {
                if (use_trash) {
                    list.Deleted = Date.now();
                    if (!(await this.BackendService.moveListsToTrash({ lists: [list] /*TODO: refactor this...*/ }))) {
                        Logger.Error(`Could not move list {${list.toLog()}} to trash`);
                        errors++;
                        continue;
                    }
                } else {
                    if (!(await this.BackendService.deleteLists({ lists: list }))) {
                        Logger.Error(`Could not delete list ${list.toLog()}`);
                        errors++;
                        continue;
                    }
                }

                deleted++;
                this._listIndex.delete(list.Uuid);
                Logger.Notice(`Removed list ${list.toLog()}`);
                if (delete_on_watch) {
                    this.ConnectIQ.SendToDevice({ device: undefined, messageType: ConnectIQMessageType.DeleteList, data: list.Uuid });
                }
            }
        }

        if (deleted > 0) {
            await this.cleanOrderLists();
            this.onListsChangedSubject.next(await this.GetLists());
        }

        AppService.AppToolbar?.ToggleProgressbar(false);

        if (errors > 0) {
            if (lists.length == 1) {
                this.Popups.Toast.Error("service-lists.delete_error");
            } else if (lists.length == errors) {
                this.Popups.Toast.Error("service-lists.delete_error_plural");
            } else {
                this.Popups.Toast.Error("service-lists.delete_error_partial");
            }
        } else {
            if (lists.length > 1) {
                this.Popups.Toast.Success("service-lists.delete_success");
            } else {
                this.Popups.Toast.Success("service-lists.delete_success_plural");
            }
        }

        return errors == 0;
    }

    /**
     * deletes all listitems in the list
     * @param lists list to be emptied
     * @returns was the list stored successful after emptying?
     */
    private async emptyLists(lists: List | List[]): Promise<boolean> {
        if (!Array.isArray(lists)) {
            lists = [lists];
        }

        if (lists.length == 0) {
            return true;
        }

        //TODO: refactor: all in one query

        const use_trash = await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true);

        AppService.AppToolbar?.ToggleProgressbar(true);

        let errors = 0;
        for (let i = 0; i < lists.length; i++) {
            let l = lists[i];

            if (l && l.ItemsCount > 0) {
                if (use_trash) {
                    const del = await this.BackendService.moveListitemsToTrash({ list: l, force: false });
                    if (!del) {
                        Logger.Error(`Could not empty list ${l.toLog()} and move items to trash`);
                        errors++;
                    }
                } else {
                    const del = await this.BackendService.deleteAllListitems({ lists: [l] /*TODO: refactor this */, force: false });
                    if (!del) {
                        Logger.Error(`Could not empty list ${l.toLog()}`);
                        errors++;
                    }
                }
                await this.refreshList(l);
                await this.cleanOrderListitems(l, true);
                Logger.Debug(`Emptied list ${l.toLog()}`);
            } else if (!l) {
                errors++;
            }
        }

        this.onListsChangedSubject.next(await this.GetLists());

        if (errors > 0) {
            if (lists.length == errors) {
                this.Popups.Toast.Error("service-lists.empty_error");
            } else {
                this.Popups.Toast.Error("service-lists.empty_error_partial");
            }
        } else {
            this.Popups.Toast.Success("service-lists.empty_success");
        }

        AppService.AppToolbar?.ToggleProgressbar(false);

        return errors == 0;
    }

    /**
     * removes a listitems from a list
     * @param list list, the item should be removed
     * @param items listitem to remove
     * @returns was the list stored successful after removal?
     */
    private async removeListitem(list: List, items: Listitem | Listitem[]): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);

        if (!Array.isArray(items)) {
            items = [items];
        }

        let success = false;
        if (await this.Preferences.Get<boolean>(EPrefProperty.TrashListitems, true)) {
            success = await this.BackendService.moveListitemsToTrash({ list: list, items: items });
            if (success) {
                Logger.Debug(`Moved ${items.length} listitem(s) of list ${list.toLog()} to trash`);
            } else {
                Logger.Error(`Could not move ${items.length} listitem(s) of list ${list.toLog()} to trash`);
            }
        } else {
            const del = await this.BackendService.deleteListitems({ list: list, items: items });
            if (del >= 0) {
                Logger.Debug(`Deleted ${del} listitem(s) from list ${list.toLog()}`);
            } else {
                Logger.Error(`Could not delete ${items.length} listitem(s) from list ${list.toLog()}`);
            }
            success = del >= 0;
        }

        if (success) {
            await this.cleanOrderListitems(list, true);
        }

        AppService.AppToolbar?.ToggleProgressbar(false);
        return success;
    }

    /**
     * erases a listitem from trash
     * @param trash trash of the list, the item should be erased
     * @param items listitem(s) to be erased
     * @returns was the erase successful
     */
    private async eraseListitemFromTrash(trash: List, items: Listitem | Listitem[]): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        if (!Array.isArray(items)) {
            items = [items];
        }
        const del = await this.BackendService.deleteListitems({ list: trash, items: items });

        if (del >= 0) {
            const text = !Array.isArray(items) || items.length == 1 ? "service-lists.erase_item_success" : "service-lists.erase_item_success_plural";
            this.Popups.Toast.Success(text);
        } else {
            const text = !Array.isArray(items) || items.length == 1 ? "service-lists.erase_item_error" : "service-lists.erase_item_error_plural";
            this.Popups.Toast.Error(text);
        }

        AppService.AppToolbar?.ToggleProgressbar(false);
        return del >= 0;
    }

    /**
     * empties the trash
     * @returns was the erase successful
     */
    private async wipeListsTrash(): Promise<number> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        const del = await this.BackendService.deleteLists({ trash: true });
        if (del > 0) {
            Logger.Notice(`Erased ${del} list(s) from trash`);
            this.Popups.Toast.Success("service-lists.empty_trash_success");
        } else {
            Logger.Error("Could not wipe lists trash");
            this.Popups.Toast.Error("service-lists.empty_trash_error");
        }

        AppService.AppToolbar?.ToggleProgressbar(false);
        return del;
    }

    private async wipeListitemTrash(lists?: List | List[] | number | number[]): Promise<number> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        if (lists && !Array.isArray(lists)) {
            lists = lists instanceof List ? ([lists] as List[]) : ([lists] as number[]);
        }
        lists = lists as List[] | number[];
        const del = await this.BackendService.deleteAllListitems({ lists: lists, trash: true, force: true });
        if (del > 0) {
            Logger.Notice(`Erased ${del} listitems from trash`);
        } else {
            Logger.Error(`Could not wipe listitem trash of ${lists ? lists.length : "all"} lists`);
        }
        return del;
    }

    /**
     * empties the listitem trash for a list
     * @param list list to empty
     * @returns was the emptying successful?
     */
    private async emptyListitemTrash(trash: List): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        const ret = await this.BackendService.deleteListitems({ list: trash, trash: true });
        if (ret >= 0) {
            Logger.Notice(`Erased trash of list ${trash.toLog()}`);
            this.Popups.Toast.Success("service-lists.empty_trash_success");
        } else {
            Logger.Error(`Could not erase trash of list ${trash.toLog()}`);
            this.Popups.Toast.Error("service-lists.empty_trash_error");
        }
        AppService.AppToolbar?.ToggleProgressbar(false);
        return ret >= 0;
    }

    /**
     * restores a list from trash
     * @param list list to restore
     * @returns was the restore successful
     */
    private async restoreListFromTrash(lists: List | List[]): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);

        if (!Array.isArray(lists)) {
            lists = [lists];
        }

        if (lists.length == 0) {
            return true;
        }

        let success = false;
        if (await this.BackendService.restoreListsFromTrash({ lists: lists })) {
            for (let i = 0; i < lists.length; i++) {
                const list = lists[i];
                await this.refreshList(list);
                list.Order = this._listIndex.size;
                await this.addListToIndex(list);
            }
            this.cleanOrderLists(false, false);
            for (let i = 0; i < lists.length; i++) {
                await this.StoreList(lists[i]);
            }

            await this.cleanOrderLists(false, false);

            if (lists.length == 1) {
                Logger.Debug(`Restored list ${lists[0].toLog()} from trash`);
                this.Popups.Toast.Success("service-lists.restore_success");
            } else {
                Logger.Debug(`Restored  ${lists.length} lists from trash`);
                this.Popups.Toast.Success("service-lists.restore_success_plural");
            }
            success = true;
        } else {
            if (lists.length == 1) {
                Logger.Error(`Could not restore list ${lists[0].toLog()} from trash`);
                this.Popups.Toast.Error("service-lists.restore_error");
            } else {
                Logger.Error(`Could not restore ${lists.length} lists from trash`);
                this.Popups.Toast.Error("service-lists.restore_error_plural");
            }
        }
        this.onListsChangedSubject.next(await this.GetLists());

        AppService.AppToolbar?.ToggleProgressbar(false);

        return success;
    }

    /**
     * restores a listitem from the trash of a list
     * @param list list, the items to restore are in
     * @param items listitem(s) to restore
     * @returns was the restore successful
     */
    private async restoreListitemFromTrash(list: List, items: Listitem | Listitem[]): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);

        if (!Array.isArray(items)) {
            items = [items];
        }

        const restore = await this.BackendService.restoreListitemsFromTrash({ list: list, items: items });
        if (restore > 0) {
            Logger.Debug(`Restored ${restore} listitem(s) from trash of list ${list.toLog()}`);
            await this.refreshList(list);
            await this.cleanOrderListitems(list, true);
            this.syncListToWatch(list);
            const text = !Array.isArray(items) || items.length == 1 ? "service-lists.restore_item_success" : "service-lists.restore_item_success_plural";
            this.Popups.Toast.Success(text);
        } else {
            Logger.Error(`Could not restore ${items.length} listitem(s) from trash of list ${list.toLog()}`);
            const text = items.length == 1 ? "service-lists.restore_item_error" : "service-lists.restore_item_error_plural";
            this.Popups.Toast.Error(text);
        }

        AppService.AppToolbar?.ToggleProgressbar(false);
        return restore > 0;
    }

    /**
     * erases lists from trash
     * @param lists Lists to be erased
     */
    private async eraseListFromTrash(lists: List | List[]): Promise<boolean> {
        AppService.AppToolbar?.ToggleProgressbar(true);
        if (!Array.isArray(lists)) {
            lists = [lists];
        }
        const ret = await this.BackendService.deleteLists({ lists: lists, trash: true });

        if (ret > 0) {
            Logger.Debug(`Erased ${ret} list(s) from trash`);
        } else {
            Logger.Error(`Could not erased ${ret} list(s) from trash`);
        }

        AppService.AppToolbar?.ToggleProgressbar(false);

        return ret > 0;
    }

    private async refreshList(list: List): Promise<void> {
        if (!list.Uuid) {
            return;
        }
        const copy = await this.GetList(list.Uuid);
        if (copy) {
            list.copy(copy);
        }
    }

    private async removeOldTrash(value: number | KeepInTrash.Enum) {
        value = KeepInTrash.FromNumber(value);
        if (KeepInTrash.StockPeriod(value)) {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = interval(value * 60 * 60 * 24).subscribe(() => {
                this.BackendService.removeOldTrash({ olderThan: value * 60 * 60 * 24 });
            });
            await this.BackendService.removeOldTrash({ olderThan: value * 60 * 60 * 24 });
            this.BackendService.MaxTrashCount = undefined;
        } else {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = undefined;
            this.BackendService.MaxTrashCount = KeepInTrash.StockSize(value);
            await this.BackendService.removeOldTrash({ maxCount: KeepInTrash.StockSize(value) });
        }
    }
}

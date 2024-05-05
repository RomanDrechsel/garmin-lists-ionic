import { Injectable } from '@angular/core';
import { Logger } from "../logging/logger";
import { DatabaseService } from "../storage/database.service";
import { ListitemsTable } from "../storage/database/tables/listitems-table";
import { List } from "./list";
import { Listitem } from "./listitem";

@Injectable({
    providedIn: 'root'
})
export class ListitemsStorageService {

    protected Backend: ListitemsTable;

    constructor(database: DatabaseService) {
        this.Backend = database.MainDb.ListItems;
    }

    /**
     * gets all items of a list from storage
     * @param list list
     * @returns array of all listitems
     */
    public async GetItems(list: List): Promise<Listitem[] | undefined> {
        const itemsmodels = await this.Backend.GetItems(list.Uuid);
        if (itemsmodels) {
            let items: Listitem[] = [];
            itemsmodels.forEach(i => {
                const item = Listitem.fromBackend(i);
                if (item) {
                    items.push(item);
                }
            });

            return items.sort((a, b) => a.Order > b.Order ? 1 : -1);
        }
        else {
            Logger.Error(`Could not fetch listitems for list ${list.toLog()} from backend ${this.Backend.BackendIdentifier}`);
            return undefined;
        }
    }

    /**
     * get the total number of items in a list
     * @param list the list
     * @returns number of items in the list
     */
    public async GetItemsCount(list: List): Promise<number> {
        return this.Backend.GetItemsCount(list.Uuid);
    }

    /**
     * stores all listitem of a list in backend if there are changes
     * @param list list of which the items should be stored
     * @param force store listitems, even if there are no changes
     * @returns all items stored?
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean> {
        if (list.Items.length > 0) {
            for (let i = 0; i < list.Items.length; i++) {
                if (await this.StoreListitem(list.Items[i], list.Uuid, force) === false) {
                    Logger.Error(`Could not store listitems for list ${list.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                    return false;
                }
            }
            Logger.Debug(`Stored listitems for list ${list.toLog()} in backend ${this.Backend.BackendIdentifier}`);
        }
        return true;
    }

    /**
     * stores a single listitem in storage
     * @param item item to be stored
     * @param list_uuid unique list-id, the item is part of
     * @param force store the item, even if there are no changes
     * @returns item stored successful? undefined if there were no changes
     */
    public async StoreListitem(item: Listitem, list_uuid: string, force: boolean = false): Promise<boolean | undefined> {
        const obj = item.toBackend(list_uuid, force);
        if (obj) {
            const id = await this.Backend.StoreItem(obj);
            if (id != undefined) {
                item.Id = id;
                item.Dirty = false;
                Logger.Debug(`Stored listitem ${item.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                return true;
            }
            else {
                Logger.Error(`Could not store listitem ${item.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                return false;
            }
        }
        else {
            return undefined;
        }
    }

    /**
     * removes all items of a list from backend
     * @param list list of which the items should be removed
     * @returns items removed successful?
     */
    public async RemoveList(list: List): Promise<boolean> {
        if (await this.Backend.RemoveList(list.Uuid)) {
            const removed = await this.Backend.Changes();
            if (removed && removed > 0) {
                Logger.Debug(`Removed all ${removed} listitem(s) from list ${list.toLog()} from backend ${this.Backend.BackendIdentifier}`);
            }
            return true;
        }
        else {
            Logger.Error(`Could not remove all listitem(s) from list ${list.toLog()} from backend ${this.Backend.BackendIdentifier}`);
            return false;
        }
    }

    /**
     * removes all items of a list with a specific uuid from backend
     * @param uuid unique id of the list
     * @returns items removed successful?
     */
    public async RemoveListByUuid(uuid: string): Promise<boolean> {
        if (await this.Backend.RemoveList(uuid)) {
            const removed = await this.Backend.Changes();
            if (removed && removed > 0) {
                Logger.Debug(`Removed all ${removed} listitem(s) from list uuid:${uuid} from backend ${this.Backend.BackendIdentifier}`);
            }
            return true;
        }
        else {
            Logger.Error(`Could not remove all listitem(s) from list uuid:${uuid} from backend ${this.Backend.BackendIdentifier}`);
            return false;
        }
    }

    /**
     * removes a single items from backend
     * @param item item to be removed
     * @returns item removed successful?
     */
    public async RemoveItem(item: Listitem): Promise<boolean> {
        if (item.Id != undefined) {
            if (await this.Backend.RemoveItem(item.Id)) {
                Logger.Debug(`Removed listitem ${item.toLog()} from backend ${this.Backend.BackendIdentifier}`);
                return true;
            }
            else {
                Logger.Error(`Could not remove listitem ${item.toLog()} from backend ${this.Backend.BackendIdentifier}`);
                return false;
            }
        }
        else {
            return true;
        }
    }
}

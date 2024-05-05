import { Injectable } from '@angular/core';
import { Logger } from "../logging/logger";
import { DatabaseService } from "../storage/database.service";
import { ListsTable } from "../storage/database/tables/lists-table";
import { List } from "./list";

@Injectable({
    providedIn: 'root'
})
export class ListsStorageService {
    protected Backend: ListsTable;

    constructor(database: DatabaseService) {
        this.Backend = database.MainDb.Lists;
    }

    /**
     * get all lists in backend
     * @returns array of all lists
     */
    public async GetLists(): Promise<List[]> {
        let lists: List[] = [];

        const result = await this.Backend.GetLists();
        result.forEach(obj => {
            const list = List.fromBackend(obj);
            if (list) {
                lists.push(list);
            }
        });

        return lists.sort((a, b) => a.Order > b.Order ? 1 : -1);
    }

    /**
     * get list information without items
     * @param uuid unique list id
     * @param check no error message, if list doesn't exist
     * @returns List object or undefined, if it doesn't exist
     */
    public async GetListWithoutItems(uuid: string, check: boolean = false): Promise<List | undefined> {
        const result = await this.Backend.GetList(uuid, check);
        if (result) {
            const list = List.fromBackend(result);
            return list;
        }
        else {
            return undefined;
        }
    }

    /**
     * stores a list in backend if there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean> {
        const obj = list.toBackend(force);
        if (obj) {
            if (await this.Backend.StoreList(obj)) {
                Logger.Debug(`Stored list ${list.toLog()} in database ${this.Backend.BackendIdentifier} `);
                return true;
            }
            else {
                Logger.Error(`Could not store list ${list.toLog()} in database ${this.Backend.BackendIdentifier}`);
                return false;
            }
        }
        else {
            //nothing to do
            return true;
        }
    }

    /**
     * removes a list from backend
     * @param list list to be removed
     * @returns removal successful?
     */
    public async RemoveList(list: List | string): Promise<boolean> {
        const uuid = list instanceof List ? list.Uuid : list;
        const log = list instanceof List ? list.toLog() : list;
        if (await this.Backend.RemoveList(uuid)) {
            Logger.Debug(`Removed list ${log} from database ${this.Backend.BackendIdentifier}`);
            return true;
        }
        else {
            Logger.Error(`Could not remove list ${log} from database ${this.Backend.BackendIdentifier}`);
            return false;
        }
    }

    /**
     * gets the total number of lists in backend
     * @returns number of lists
     */
    public async GetListsCount(): Promise<number> {
        return this.Backend.GetNumLists();
    }
}

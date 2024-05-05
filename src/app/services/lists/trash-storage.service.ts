import { Injectable } from '@angular/core';
import { Logger } from "../logging/logger";
import { DatabaseService } from "../storage/database.service";
import { ListsTrashTable } from "../storage/database/tables/lists-trash-table";
import { List } from "./list";
import { ListsStorageService } from "./lists-storage.service";

@Injectable({
    providedIn: 'root'
})
export class TrashStorageService extends ListsStorageService {
    protected override Backend: ListsTrashTable;

    constructor(
        database: DatabaseService
    ) {
        super(database);
        this.Backend = database.MainDb.ListsTrash;
    }

    /**
     * get all lists in trash
     * @returns array of all lists in trash
     */
    public override async GetLists(): Promise<List[]> {
        let lists: List[] = [];

        const result = await this.Backend.GetLists();
        result.forEach(obj => {
            const list = List.fromBackend(obj);
            if (list) {
                lists.push(list);
            }
        });

        return lists.sort((a, b) => a.Deleted < b.Deleted ? 1 : -1);
    }

    /**
     * stores a list in trash backend. the list is always stored, even if there are no changes
     * @param list list to be stored
     * @returns list successfully stored?
     */
    public override async StoreList(list: List): Promise<boolean> {
        const obj = list.toBackend(true); //always store list in trash
        if (obj) {
            if (await this.Backend.StoreList(obj)) {
                Logger.Debug(`Stored list ${list.toLog()} in backend ${this.Backend.BackendIdentifier} `);
                return true;
            }
            else {
                Logger.Error(`Could not store list ${list.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                return false;
            }
        }
        else {
            //nothing to do
            return true;
        }
    }

    /**
     * removes old enties, which are older the a specific number of seconds
     * @param seconds number of seconds
     */
    public async removeOldEntries(seconds: number): Promise<string[]> {
        const uuids = await this.Backend.GetOlderLists(seconds);
        if (uuids.length > 0) {
            const removed = await this.Backend.RemoveLists(uuids);
            if (removed == uuids.length) {
                Logger.Notice(`Removed ${removed} old list(s) from trash in backend ${this.Backend.BackendIdentifier}`);
            }
        }

        return uuids;
    }

    /**
     * returns all lists that exceeds the limit
     * @param limit limit of lists
     * @returns excess lists
     */
    public async GetExcesses(limit: number): Promise<string[]> {
        const uuids = await this.Backend.GetExcesses(limit);
        if (uuids) {
            return uuids;
        }
        else {
            return [];
        }
    }
}

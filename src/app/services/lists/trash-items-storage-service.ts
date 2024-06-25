import { Injectable } from "@angular/core";
import { Logger } from "../logging/logger";
import { DatabaseService } from "../storage/database.service";
import { ListitemsTrashTable } from "../storage/database/tables/listitems-trash-table";
import { Listitem } from "./listitem";
import { ListitemsStorageService } from "./listitems-storage.service";

@Injectable({
    providedIn: "root",
})
export class TrashItemsStorageService extends ListitemsStorageService {
    protected override Backend: ListitemsTrashTable;

    constructor(database: DatabaseService) {
        super(database);
        this.Backend = database.MainDb.ListitemsTrash;
    }

    /**
     * stores a listitems in trash
     * @param item item to be stored
     * @param list_uuid unique list id, the item is part of
     * @returns item successfully stored?
     */
    public override async StoreListitem(item: Listitem, list_uuid: string): Promise<boolean> {
        const obj = item.toBackend(list_uuid, true); //always store them in trash database
        if (obj) {
            const id = await this.Backend.StoreItem(obj);
            if (id != undefined) {
                item.Uuid = id;
                Logger.Debug(`Stored listitem ${item.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                return true;
            } else {
                Logger.Error(`Could not store listitem ${item.toLog()} in backend ${this.Backend.BackendIdentifier}`);
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * removes all listitems which were deleted more than a certain amount of seconds ago
     * @param seconds amount of seconds
     * @returns removal successful?
     */
    public async removeOldEntries(seconds: number): Promise<boolean> {
        const removed = await this.Backend.RemoveOldItems(seconds);
        if (removed) {
            if (removed > 0) {
                Logger.Notice(`Removed ${removed} old listitems from backend ${this.Backend.BackendIdentifier}`);
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * Counts the number of listitems in the trash.
     * @param uuid - Optional unique list id to filter the count.
     * @returns The number of listitems in the trash. If an error occurs during the count operation, returns -1.
     */
    public async Count(uuid: string | undefined = undefined): Promise<number> {
        const count = await this.Backend.Count(uuid);
        if (count) {
            return count;
        } else {
            Logger.Error(`Could not fetch items-trash count in backend ${this.Backend.BackendIdentifier}`);
            return -1;
        }
    }

    public async Empty(uuid: string | undefined = undefined): Promise<boolean> {
        return await this.Backend.Empty(uuid);
    }
}

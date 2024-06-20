import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { FileUtils } from "../../classes/utils/fileutils";
import { Logger } from "../logging/logger";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListitemTrash } from "./listitem-trash";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class TrashProviderService extends ListsProviderService {
    protected override StoragePath = "trash";
    protected StoragePathItems = "trash/items";

    public TrashListsChangedSubject = new BehaviorSubject<List[]>([]);
    public TrashListitemsChangedSubject = new BehaviorSubject<{ list: List; items: Listitem[] } | undefined>(undefined);

    public async Count(): Promise<number> {
        return (await this.GetLists()).length;
    }

    /**
     * erases a listitem from trash
     * @param list list, the item should be erased
     * @param trashitem listitem to be erased
     * @returns was the erase successful
     */
    public async EraseListitem(list: List, trashitem: Listitem): Promise<boolean> {
        const trash = await this.getListitemTrash(list);
        if (trash) {
            const success = trash.RemoveItem(trashitem);
            if (success) {
                if (await trash.Store(this.Backend, this.StoragePathItems)) {
                    Logger.Debug(`Removed listitem ${trashitem.toLog()} from trash of list ${list.toLog()}`);
                    this.TrashListitemsChangedSubject.next({ list: list, items: trash.Listitems });
                }
            } else {
                Logger.Error(`Could not remove listitem ${trashitem.toLog()} from trash of list ${list.toLog()}`);
            }
            return success;
        } else {
            return false;
        }
    }

    /**
     * remove all lists from trash, that are older than a certain number of seconds
     * @param seconds maximum age of the files in seconds
     */
    public async RemoveOldEntries(seconds: number): Promise<void> {
        //remove old lists in trash
        if ((await this.Backend.RemoveOldFiles(seconds, this.StoragePath)) > 0) {
            this.TrashListsChangedSubject.next(await this.GetLists());
        }

        //remove old listitems in trashes of the lists
        const timestamp = Date.now() - seconds * 1000;
        const listitemtrashfiles = await this.Backend.GetAllFiles(this.StoragePathItems);
        for (let i = 0; i < listitemtrashfiles.length; i++) {
            const file = await FileUtils.GetFile(listitemtrashfiles[i].uri);
            if (file.Exists) {
                const trash = ListitemTrash.fromBackend(file.Content);
                if (trash) {
                    const removed = trash.RemoveOlderThan(timestamp);
                    if (removed != 0) {
                        await trash.Store(this.Backend, this.StoragePathItems);
                    }
                }
            }
        }
    }

    /**
     * removes the oldes entries in trash due to a certain number
     * @param maxcount maximum number of lists in trash
     */
    public async LimitEntryCount(maxcount?: number): Promise<void> {
        if (!maxcount) {
            return;
        }
        // delete old files, exceeding the limit
        if (maxcount && (await this.Backend.LimitFileCount(maxcount, this.StoragePath)) > 0) {
            this.TrashListsChangedSubject.next(await this.GetLists());
        }

        const listitemtrashfiles = await this.Backend.GetAllFiles(this.StoragePathItems);
        for (let i = 0; i < listitemtrashfiles.length; i++) {
            const file = await FileUtils.GetFile(listitemtrashfiles[i].uri);
            if (file.Exists) {
                const trash = ListitemTrash.fromBackend(file.Content);
                if (trash) {
                    trash.RemoveOldestCount(trash.Listitems.length - maxcount);
                    await trash.Store(this.Backend, this.StoragePathItems);
                }
            }
        }
    }

    /**
     * erase a list from trash and also all listitems in trash
     * @param lists list or array of lists to be removed
     * @returns how many lists where deleted?
     */
    public async EraseLists(lists: List | List[]): Promise<number> {
        if (!Array.isArray(lists)) {
            lists = [lists];
        }
        const uuids = lists.map(list => list.Uuid);
        await this.Backend.RemoveFilesbyUuid(uuids, this.StoragePath);
        await this.Backend.RemoveFilesbyUuid(uuids, this.StoragePathItems);
        this.TrashListsChangedSubject.next(await this.GetLists());
        return uuids.length;
    }

    /**
     * creates a ListitemTrash object for a list uuid
     * @param list list to get trash items from
     * @returns ListitemTrash object or undefined if there are no items in list trash
     */
    private async getListitemTrash(list: List): Promise<ListitemTrash | undefined> {
        const file = await this.Backend.GetFile(this.createFilenamePattern(list.Uuid));
        if (file?.Exists) {
            return ListitemTrash.fromBackend(JSON.parse(file!.Content!));
        } else {
            return undefined;
        }
    }
}

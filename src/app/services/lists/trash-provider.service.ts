import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { FileUtils } from "../../classes/utils/fileutils";
import { Logger } from "../logging/logger";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListitemTrash } from "./listitem-trash";
import { ListitemsTrashProviderService } from "./listitems-trash-provider.service";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class TrashProviderService extends ListsProviderService {
    protected override StoragePath = "trash";

    public ListsDatasetChangedSubject = new BehaviorSubject<List[]>([]);

    private ListitemsTrash!: ListitemsTrashProviderService;

    /**
     * remove all lists from trash, that are older than a certain number of seconds
     * @param seconds maximum age of the files in seconds
     */
    public async RemoveOldEntries(days: number): Promise<void> {
        //WIP: Arbeitsstand
        const oldfiles = await this.Backend.GetOldFiles(days * 60 * 60 * 24, this.StoragePath);
        if (oldfiles.length > 0) {
            let lists: List[] = [];
            for (let i = 0; i < oldfiles.length; i++) {
                let ok = false;
                const file = await this.Backend.GetFile(oldfiles[i]);
                if (file?.Exists) {
                    const list = List.fromBackend(file.Content!);
                    if (list) {
                        lists.push(list);
                        ok = true;
                    }
                }
                if (!ok) {
                    //invalid file, just delete it
                    await this.Backend.RemoveFilesByUri(oldfiles[i]);
                    Logger.Error(`Removed invalid trash-file '${oldfiles[i]}' (${FileUtils.File.FormatSize(file?.size ?? -1)}) from lists backend`);
                }
            }
            if (lists.length > 0) {
                const uuids = lists.map(l => l.Uuid);
                const removed = await this.Backend.RemoveFilesbyUuid(uuids, this.StoragePath);
                if (removed > 0) {
                    Logger.Notice(`Removed ${removed} old lists from trash, as if they are older than ${days} days`);
                    this.ListsDatasetChangedSubject.next(await this.GetLists());
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
        let allfiles = await this.Backend.GetAllFiles(this.StoragePath);
        if (allfiles.length > maxcount) {
            allfiles = allfiles.sort((a, b) => b.mtime - a.mtime);
            while (allfiles.length > maxcount) {
                const file = allfiles.pop();
                if (file) {
                    await this.Backend.removeFile(file.uri);
                }
            }
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
        this.ListsDatasetChangedSubject.next(await this.GetLists());
        return uuids.length;
    }

    /**
     * stores one or more listitems in the trash of a list
     * @param list the items are stored in the trash of this list
     * @param items items to store in trash
     * @param maxCount maximum number of listitems in the trash, if the number of items exceeds this number, the oldest items will be removed
     * @returns was the storage successful?
     */
    public async StoreListitems(list: List, items: Listitem[], maxCount?: number): Promise<boolean> {
        let trash = (await this.getListitemTrash(list)) ?? new ListitemTrash(list.Uuid);
        items.forEach(i => {
            i.Deleted = Date.now();
        });
        trash.AddItems(items);

        if (maxCount && trash.Listitems.length > maxCount) {
            trash.RemoveOldestCount(trash.Listitems.length - maxCount);
        }

        return await trash.Store(this.Backend, this.StoragePathItems);
    }
}

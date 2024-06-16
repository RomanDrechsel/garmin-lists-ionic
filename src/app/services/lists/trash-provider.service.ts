import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { FileUtils } from "../../classes/utils/fileutils";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class TrashProviderService extends ListsProviderService {
    protected override StoragePath = "trash";
    protected StoragePathItems = "trash/items";

    public TrashListsChangedSubject = new BehaviorSubject<List[]>([]);
    public TrashListitemsChangedSubject = new BehaviorSubject<{ list: List; items: Listitem[] } | undefined>(undefined);

    /**
     * erases a listitem from trash
     * @param list list, the item should be erased
     * @param item listitem to be erased
     * @returns was the erase successful
     */
    public async EraseListitem(list: List, item: Listitem): Promise<boolean> {}

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
                const content = JSON.parse(file.Content!);
                if (content.items && Array.isArray(content.items)) {
                    const remove_indices: number[] = [];
                    for (let j = 0; j < content.items.length; j++) {
                        const item = Listitem.fromBackend(content.items[j]);
                        if (!item || item.Deleted == undefined || item.Deleted < timestamp) {
                            remove_indices.push(j);
                        }
                    }
                    if (remove_indices.length > 0) {
                        for (let j = remove_indices.length - 1; j >= 0; j--) {
                            content.items.splice(remove_indices[j], 1);
                        }
                        if (content.items.length == 0) {
                            //no more items in trash of this list -> remove the file
                            await this.Backend.RemoveFilesByUri(file.Path);
                        } else {
                            //rewrite the file
                            await this.Backend.StoreFile({ filename: file.Path, subpath: this.StoragePathItems, data: JSON.stringify(content) });
                        }
                    }
                }
            }
        }
    }

    /**
     * removes the oldes entries in trash due to a certain number
     * @param maxcount maximum number of lists in trash
     */
    public async LimitEntryCount(maxcount?: number) {
        if (!maxcount) {
            return;
        }
        // delete old files, exceeding the limit
        if (maxcount && (await this.Backend.LimitFileCount(maxcount, this.StoragePath)) > 0) {
            this.TrashListsChangedSubject.next(await this.GetLists());
        }

        //WIP: delete old listitems, exceeding the limit for every trash-file
        const listitemtrashfiles = await this.Backend.GetAllFiles(this.StoragePathItems);
        for (let i = 0; i < listitemtrashfiles.length; i++) {
            const file = await FileUtils.GetFile(listitemtrashfiles[i].uri);
            if (file.Exists) {
                const content = JSON.parse(file.Content!);
                if (content.items && Array.isArray(content.items) && content.items.length > maxcount) {
                    content.items = content.items.sort((a: any, b: any) => {
                        if (a && a.deleted && b && b.deleted) {
                            return a.deleted - b.deleted;
                        } else {
                            return 0;
                        }
                    });
                    while (content.items.length > maxcount) {
                        content.items.shift();
                    }
                }

                if (content.items?.length == 0) {
                    //no more items in trash of this list -> remove the file
                    await this.Backend.RemoveFilesByUri(file.Path);
                } else {
                    //rewrite the file
                    await this.Backend.StoreFile({ filename: file.Path, subpath: this.StoragePathItems, data: JSON.stringify(content) });
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
        return uuids.length;
    }
}

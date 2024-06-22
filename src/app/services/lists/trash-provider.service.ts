import { Injectable, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Logger } from "../logging/logger";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListitemsTrashProviderService } from "./listitems-trash-provider.service";
import { ListitemTrash } from "./listitems-trash-utils";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class TrashProviderService extends ListsProviderService {
    protected override StoragePath = "trash";

    public ListsDatasetChangedSubject = new BehaviorSubject<List[]>([]);

    private ListitemsTrash = inject(ListitemsTrashProviderService);

    /**
     * remove all lists from trash, that are older than a certain number of seconds
     * @param seconds maximum age of the files in seconds
     */
    public async RemoveOldEntries(days: number): Promise<void> {
        const oldlists = await this.Backend.GetOldEntries(days * 60 * 60 * 24, this.StoragePath);
        if (oldlists.length > 0) {
            const removed = await this.Backend.RemoveLists(oldlists, this.StoragePath);
            if (removed > 0) {
                //remove old listitems trashes from Backend
                await this.ListitemsTrash.EraseLists(oldlists);
                Logger.Notice(`Removed ${removed} old lists from trash, as if they are older than ${days} days`);
                this.ListsDatasetChangedSubject.next(await this.GetLists());
            }
        }
    }

    /**
     * removes the oldes entries in trash due to a certain number
     * @param maxcount maximum number of lists in trash
     */
    public async LimitEntryCount(maxcount: number): Promise<void> {
        let alllists = await this.Backend.GetLists(this.StoragePath);
        if (alllists.length > maxcount) {
            alllists = alllists.sort((a, b) => {
                if (!a.deleted) {
                    a.deleted = 0;
                }
                if (!b.deleted) {
                    b.deleted = 0;
                }
                return b.deleted - a.deleted;
            });
            const uuids = alllists.splice(maxcount).map(l => l.uuid);
            const del = await this.Backend.RemoveLists(uuids, this.StoragePath);
            await this.ListitemsTrash.EraseLists(uuids);
            if (del == uuids.length) {
                Logger.Notice(`Removed ${del} old lists from trash due to the limit of ${maxcount} lists`);
                this.ListsDatasetChangedSubject.next(await this.GetLists());
            } else if (del > 0) {
                Logger.Error(`Removed ${del} old lists from trash due to the limit of ${maxcount} lists, but ${uuids.length - del} list(s) could not be removed`);
                this.ListsDatasetChangedSubject.next(await this.GetLists());
            } else {
                Logger.Error(`Could not remove ${uuids.length} list(s) from trash due to the limit of ${maxcount} lists`, uuids);
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
        await this.Backend.RemoveLists(uuids, this.StoragePath);
        await this.Backend.RemoveLists(uuids, this.StoragePathItems);
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

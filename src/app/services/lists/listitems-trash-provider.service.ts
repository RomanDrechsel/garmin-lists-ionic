import { Injectable, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Logger } from "../logging/logger";
import { ListsBackendService } from "../storage/list-backend/lists-backend.service";
import { List } from "./list";
import { Listitem, ListitemModel } from "./listitem";
import { ListitemTrashModel, ListitemTrashUtils } from "./listitems-trash-utils";

@Injectable({
    providedIn: "root",
})
export class ListitemsTrashProviderService {
    private readonly StoragePath = "trash/items";

    private readonly Backend = inject(ListsBackendService);

    public ListitemsDatasetChangedSubject = new BehaviorSubject<{ list: List; items: Listitem[] } | undefined>(undefined);

    /**
     * stores trash of listitems for a list in backend or removes it, if there are no more items in it
     * @param trash listitem trash object
     * @returns was the storage/removal successful?
     */
    public async Store(trash: ListitemTrashModel): Promise<boolean> {
        if (trash.items.length > 0) {
            //store in backend
            return await this.Backend.StoreListitemTrash(trash, this.StoragePath);
        } else {
            //no more items in trash, remove the file
            return (await this.Backend.RemoveListitemsTrash(trash.uuid, this.StoragePath)) !== false;
        }
    }

    /**
     * erases a listitem from trash
     * @param list list, the item should be erased
     * @param trashitem listitem to be erased
     * @returns was the erase successful
     */
    public async EraseListitem(list: List, trashitem: Listitem): Promise<boolean> {
        const trash = await this.Backend.GetListitemTrash(list.Uuid, this.StoragePath);
        if (trash) {
            const success = ListitemTrashUtils.RemoveItem(trash, item) trash.RemoveItem(trashitem);
            if (success) {
                if (await this.Store(trash)) {
                    Logger.Debug(`Removed listitem ${trashitem.toLog()} from trash of list ${list.toLog()}`);
                    this.ListitemsDatasetChangedSubject.next({ list: list, items: trash.Listitems });
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
     * erases all listitems in trash of a list
     * @param list list, to erase the listitems in trash
     * @returns was the deletion successful? undefined if there was no trash for this list
     */
    public async EraseLists(uuids: string | string[]): Promise<boolean | undefined> {
        return this.Backend.RemoveListitemsTrash(uuids);
    }

    //WIP: Arbeitsstand
    public async LimitEntryCount(maxcount: number): Promise<void> {
        const alltrashes = await this.Backend.GetListitemsTrashes(this.StoragePath);
        for (let i = 0; i < alltrashes.length; i++) {
            const trash = alltrashes[i];
            if (trash.items.length > maxcount) {
                const before = trash.items.length;
                trash.items = ListitemTrash.Sort<ListitemModel>(trash.items);
                trash.items = trash.items.slice(maxcount);
                if (await this.Store(trash)) {
                }
            }
            if (trash) {
                trash.RemoveOldestCount(trash.Listitems.length - maxcount);
                await trash.Store(this.Backend, this.StoragePath);
            }
        }
    }
}

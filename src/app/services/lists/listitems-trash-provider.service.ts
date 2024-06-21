import { Injectable, inject } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Logger } from "../logging/logger";
import { ListBackendService } from "../storage/list-backend/list-backend.service";
import { List } from "./list";
import { Listitem } from "./listitem";
import { ListitemTrash } from "./listitem-trash";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class ListitemsTrashProviderService {
    private readonly StoragePathItems = "trash/items";

    private readonly Backend = inject(ListBackendService);

    public ListitemsDatasetChangedSubject = new BehaviorSubject<{ list: List; items: Listitem[] } | undefined>(undefined);

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
     * creates a ListitemTrash object for a list uuid
     * @param list list to get trash items from
     * @returns ListitemTrash object or undefined if there are no items in list trash
     */
    private async getListitemTrash(list: List): Promise<ListitemTrash | undefined> {
        const file = await this.Backend.GetFile(ListsProviderService.createFilenamePattern(list.Uuid));
        if (file?.Exists) {
            return ListitemTrash.fromBackend(JSON.parse(file!.Content!));
        } else {
            return undefined;
        }
    }
}

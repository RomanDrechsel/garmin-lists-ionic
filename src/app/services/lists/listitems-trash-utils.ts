import { ListitemModel } from "./listitem";

export namespace ListitemTrashUtils {
    /**
     * deletes a certain item from the trash
     * @param trash trash of listitems
     * @param item item to delete
     * @returns was the item found and deleted?
     */
    export function RemoveItem(trash: ListitemTrashModel, item: string | number | ListitemModel): ListitemTrashModel {
        if (typeof item !== "string" && typeof item !== "number") {
            item = item.uuid;
        }
        for (let i = 0; i < trash.items.length; i++) {
            if (trash.items[i].uuid == item) {
                trash.items.splice(i, 1);
                break;
            }
        }
        return trash;
    }

    /**
     * adds one or more items to the trash
     * @param trash trash of listitems
     * @param items item(s) to add
     * @returns trash of listitems
     */
    export function AddItems(trash: ListitemTrashModel, items: ListitemModel[]): ListitemTrashModel {
        trash.items = trash.items.concat(items);
        return trash;
    }

    /**
     * removes the oldest items in the trash
     * @param trash trash of listitems
     * @param count number of items to remove
     * @returns trash of listitems
     */
    export function RemoveOldestCount(trash: ListitemTrashModel, count: number = 1): ListitemTrashModel {
        trash = SortItems(trash);
        trash.items = trash.items.slice(0, count);
        return trash;
    }

    /**
     * removes items, that are older than a certain timestamp
     * @param trash trash of listitems
     * @param timestamp UNIX Timestamp in milliseconds
     * @returns trash of listitems
     */
    export function RemoveOlderThan(trash: ListitemTrashModel, timestamp: number): ListitemTrashModel {
        trash.items = trash.items.filter(i => i.deleted != undefined && i.deleted > timestamp);
        return trash;
    }

    /**
     * sort the listitems by date of deletion, most recent first
     * @param trash trash of listitems
     * @returns trash of listitems with sorted listitems
     */
    export function SortItems(trash: ListitemTrashModel): ListitemTrashModel {
        trash.items = trash.items.sort((a, b) => {
            return (b.deleted ?? 0) - (a.deleted ?? 0);
        });
        return trash;
    }

    /**
     * returns a string representation of the trash object for the log
     * @param trash object to be represented
     * @returns string representation of the object
     */
    export function toLog(trash: ListitemTrashModel | ListitemModel): string {
        return `uuid:${trash.uuid}`;
    }
}

export declare type ListitemTrashModel = {
    uuid: string | number;
    items: ListitemModel[];
};

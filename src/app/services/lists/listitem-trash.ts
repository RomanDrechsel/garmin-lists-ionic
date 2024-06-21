import { Logger } from "../logging/logger";
import { ListBackendService } from "../storage/list-backend/list-backend.service";
import { Listitem, ListitemModel } from "./listitem";

export class ListitemTrash {
    /**
     * Unique identifier of the list
     */
    public readonly Uuid: string;
    private _listitems: Listitem[] = [];

    /**
     * stores listitems in the trash of a list
     * @param uuid Unique identifier of the list
     * @param listitems listitems in the trash
     */
    public constructor(uuid: string, listitems?: Listitem[]) {
        this.Uuid = uuid;
        if (listitems) {
            this._listitems = listitems;
        } else {
            this._listitems = [];
        }
    }

    /**
     * Listitems in the list trash
     */
    public get Listitems(): Listitem[] {
        return this._listitems;
    }

    /**
     * creates an object to store in backend that could be restored by fromBackend
     * @returns object to store as json in backend
     */
    public toBackend(): ListitemTrashModel | undefined {
        if (this._listitems.length > 0) {
            let items: ListitemModel[] = [];
            this._listitems.forEach(i => {
                const item = i.toBackend();
                if (item) {
                    items.push(item);
                }
            });
            if (items.length == 0) {
                return undefined;
            }

            return {
                uuid: this.Uuid,
                items: items,
            };
        } else {
            return undefined;
        }
    }

    /**
     * deletes a certain item from the trash
     * @param item item to delete
     * @returns was the item found and deleted?
     */
    public RemoveItem(item: Listitem): boolean {
        for (let i = 0; i < this._listitems.length; i++) {
            if (this._listitems[i] == item) {
                this._listitems.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * store the listitem trash in backend, or removes it, if there are no more items
     * @param backend ListsBackend
     * @param subpath subfolder to store listitems trash
     * @returns was the storage successful?
     */
    public async Store(backend: ListBackendService, subpath?: string): Promise<boolean> {
        const json = this.toBackend();
        if (json) {
            if (await backend.StoreFile({ filename: `${this.Uuid}.json`, subpath: subpath, data: JSON.stringify(json) })) {
                return true;
            }
        } else {
            const del = await backend.RemoveFilesbyUuid(this.Uuid, subpath);
            if (del > 0) {
                return true;
            }
        }

        return false;
    }

    public async AddItems(items: Listitem[]) {
        this._listitems = this._listitems.concat(items);
    }

    /**
     * removes the oldest items in the trash
     * @param count number of items to remove
     */
    public RemoveOldestCount(count: number = 1) {
        this._listitems = this._listitems.slice(0, count);
    }

    /**
     * removes items, that are older than a certain timestamp
     * @param timestamp UNIX Timestamp in milliseconds
     * @returns number of removed items
     */
    public RemoveOlderThan(timestamp: number): number {
        const count = this._listitems.length;
        this._listitems = this._listitems.filter(i => i.Deleted != undefined && i.Deleted > timestamp);
        if (count != this._listitems.length) {
            return count - this._listitems.length;
        } else {
            return 0;
        }
    }

    /**
     * creates a new ListitemTrash object from backend data
     * @param obj object or json string from backend
     * @returns ListitemsTrash object or undefined if obj is invalid
     */
    public static fromBackend(obj: any): ListitemTrash | undefined {
        if (typeof obj === "string") {
            obj = JSON.parse(obj);
        }

        if (!obj) {
            return undefined;
        }

        const props = ["uuid", "items"];
        for (let i = 0; i < props.length; i++) {
            if (!obj.hasOwnProperty(props[i])) {
                Logger.Error(`Could not read listitem trash from backend, property ${props[i]} not found}`);
                return undefined;
            }
        }

        const uuid = obj.uuid;
        if (uuid.length == 0) {
            Logger.Error(`Could not read listitem trash from backend, property uuid is empty`);
            return undefined;
        }

        let items: Listitem[] = [];
        if (Array.isArray(obj.items)) {
            obj.items.forEach((i: any) => {
                const item = Listitem.fromBackend(i);
                if (item) {
                    items.push(item);
                }
            });
        }
        items.sort((a, b) => {
            if (!a.Deleted) {
                a.Deleted = 0;
            }
            if (!b.Deleted) {
                b.Deleted = 0;
            }
            return a.Deleted - b.Deleted;
        });

        return new ListitemTrash(uuid, items);
    }
}

export declare type ListitemTrashModel = {
    uuid: string;
    items: ListitemModel[];
};

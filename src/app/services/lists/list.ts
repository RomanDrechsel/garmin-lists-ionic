import { GeoFence, GeoFenceModel } from "../geo/geo-fence";
import { Logger } from "../logging/logger";
import { Listitem, ListitemModel } from "./listitem";

export class List {
    private _uuid: string;
    private _name: string;
    private _created: number;
    private _updated: number;
    private _order: number;
    private _itemsCount?: number;
    private _items?: Listitem[];
    private _deleted?: number;
    private _geofence?: GeoFence;
    private _geofenceEnabled: boolean = false;
    private _dirty: boolean = false;

    private constructor(args: { uuid: string; name: string; order: number; created?: number; updated?: number; itemscount?: number; deleted?: number; dirty?: boolean }) {
        this._name = args.name;
        this._order = args.order;
        this._uuid = args.uuid;
        this._created = args.created ?? Date.now();
        this._updated = args.updated ?? Date.now();
        this._itemsCount = args.itemscount ?? 0;
        this._deleted = args.deleted;
        this._dirty = args.dirty ?? true;
    }

    /** get unique list id */
    public get Uuid(): string {
        return this._uuid;
    }

    /** set list title */
    public set Name(name: string) {
        if (this._name != name) {
            this._name = name;
            this._dirty = true;
            this._updated = Date.now();
        }
    }

    /** get list title */
    public get Name(): string {
        return this._name;
    }

    /** get created timestamp */
    public get Created(): number {
        return this._created;
    }

    /** set updated timestamp */
    public set Updated(updated: number) {
        if (this._updated != updated) {
            this._updated = updated;
            this._dirty = true;
        }
    }

    /** get updated timestamp */
    public get Updated(): number | undefined {
        return this._updated;
    }

    /** set order number */
    public set Order(order: number) {
        if (this._order != order) {
            this._order = order;
            this._dirty = true;
        }
    }

    /** get order number */
    public get Order(): number {
        return this._order;
    }

    /** get number of items of this list */
    public get ItemsCount(): number {
        if (this._items) {
            return this._items.length;
        } else {
            return this._itemsCount ?? 0;
        }
    }

    /** set the list of all items */
    public set Items(items: Listitem[]) {
        this._items = items;
        this._itemsCount = this._items.length;
    }

    /** get the list of all items */
    public get Items(): Listitem[] {
        if (this._items) {
            return this._items;
        } else {
            return [];
        }
    }

    /** set the delete timestamp */
    public set Deleted(date: number) {
        if (this._deleted != date) {
            this._dirty = true;
            this._deleted = date;
        }
    }

    /** get the deleted timestamp */
    public get Deleted(): number {
        return this._deleted ?? 0;
    }

    /** set the geofence */
    public set GeoFence(fence: GeoFence | undefined) {
        if ((fence && !fence.equals(this.GeoFence)) || (!fence && this.GeoFence)) {
            this._dirty = true;
            this._geofence = fence;
            this._geofenceEnabled = fence != undefined;
        }
    }

    /** get the geofence */
    public get GeoFence(): GeoFence | undefined {
        return this._geofence;
    }

    /** set the geofence enabled state */
    public set GeoFenceEnabled(enabled: boolean) {
        if (this._geofenceEnabled != enabled) {
            this._geofenceEnabled = enabled;
            this._dirty = true;
        }
    }

    /** get the geofence enabled state */
    public get GeoFenceEnabled(): boolean {
        return this._geofenceEnabled;
    }

    /** are only peek information loaded */
    public get isPeek(): boolean {
        return this.Items == undefined;
    }

    /**
     * Is the list needed to be stored in backend?
     */
    public get Dirty(): boolean {
        if (this._dirty == true) {
            return true;
        }

        if (this._items) {
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].Dirty) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * adds a new item to the list
     * @param item item to add
     * @returns item that was added
     */
    public AddItem(item: Listitem): Listitem {
        item.Order = this.Items.length;
        if (!this._items) {
            this._items = [item];
        } else {
            this._items.push(item);
        }
        this._itemsCount = this._items.length;
        this.Updated = Date.now();
        this._dirty = true;
        return item;
    }

    /**
     * removes a item from the list
     * @param item item to remove
     */
    public RemoveItem(item: Listitem) {
        this._items = this.Items.filter(el => el != item);
        this._itemsCount = this._items.length;

        let order = 0;
        this._items.forEach(i => {
            i.Order = order++;
        });
        this._dirty = true;
        this.Updated = Date.now();
    }

    /**
     * deletes all items of the list
     */
    public DeleteAllItems() {
        this._items = undefined;
        this._itemsCount = 0;
        this._dirty = true;
        this.Updated = Date.now();
    }

    /**
     * the list is not longer dirty
     */
    public Clean() {
        this._dirty = false;
        this._items?.forEach(i => i.Clean());
    }

    /**
     * get detailed information of another list, but not override peek details
     * @param list the other list
     */
    public copyDetails(list: List | undefined) {
        if (list && !list.isPeek) {
            this.Items = list.Items;
            this.GeoFence = list.GeoFence;
            this.GeoFenceEnabled = list.GeoFenceEnabled;
        }
    }

    /**
     * create an object to send to a device
     * @returns device object representation
     */
    public toDeviceJson(): string {
        let items: any[] = [];

        let order = 0;
        this.Items.forEach(item => {
            const obj = item.toDeviceObject();
            if (obj) {
                obj.order = order++;
                items.push(obj);
            }
        });
        return JSON.stringify({ type: "list", uuid: this._uuid, name: this._name, date: this._updated, order: this._order, items: items });
    }

    /**
     * create an object to store in backend, returns undefined if to changes on the list
     * @param force force to create an object, even if nothing changed
     * @returns object for backend storage, undefined if no changes
     */
    public toBackend(force: boolean = false): ListModel | undefined {
        if (!this.Dirty && !force) {
            return undefined;
        } else {
            const ret: ListModel = {
                uuid: this._uuid,
                name: this._name,
                items: [],
                created: this._created,
                updated: this._updated ?? undefined,
                geofence: undefined,
                geofence_enabled: undefined,
                order: this._order,
            };

            if (this._items && this._items.length > 0) {
                this._items.forEach(item => {
                    ret.items.push(item.toBackend());
                });
            }

            if (this._geofence) {
                ret.geofence = this._geofence.toBackend();
                ret.geofence_enabled = this._geofenceEnabled;
            }

            this.Clean();
            return ret;
        }
    }

    /**
     * string to identify list in logfiles
     * @returns
     */
    public toLog(): string {
        return `uuid:${this.Uuid}`;
    }

    /**
     * creates a list object from backend
     * @param obj backend object
     * @returns List object
     */
    public static fromBackend(obj: any, only_peek: boolean = false): List | undefined {
        const props = ["uuid", "name", "created", "order"];
        for (let i = 0; i < props.length; i++) {
            if (!obj.hasOwnProperty(props[i])) {
                Logger.Error(`List could not been read from database, property ${props[i]} not found}`);
                return undefined;
            }
        }
        const list = new List({
            uuid: obj.uuid,
            name: obj.name,
            created: obj.created,
            order: obj.order,
            updated: obj.updated,
            itemscount: obj.items?.length ?? 0,
            deleted: obj.deleted,
        });

        if (!only_peek) {
            if (obj.items) {
                let items: Listitem[] = [];
                obj.items.forEach((el: any) => {
                    const i = Listitem.fromBackend(el);
                    if (i) {
                        items.push(i);
                    }
                });
                list.Items = items;
            }
            if (obj.geofence) {
                list.GeoFence = GeoFence.fromBackend(obj.geofence);
            }
            if (list.GeoFence && obj.geofence_enabled) {
                list.GeoFenceEnabled = obj.geofence_enabled;
            }
        }
        list.Clean();

        return list;
    }

    /**
     * creates a new List object from user input
     * @param obj user input
     * @returns List object
     */
    public static Create(obj: { name: string; uuid: string; order: number }): List {
        return new List(obj);
    }
}

export declare type ListModel = {
    uuid: string;
    name: string;
    created: number;
    order: number;
    updated?: number;
    deleted?: number;
    items: ListitemModel[];
    geofence?: GeoFenceModel;
    geofence_enabled?: boolean;
};

import { ListItemEditorReturn } from "../../components/list-item-editor/list-item-editor.component";
import { Logger } from "../logging/logger";
import { ListitemModel } from "../storage/database/models/listitem-model";

export class Listitem {
    private _databaseId?: number;
    private _order: number;
    private _created: number;
    private _updated: number;
    private _item: string;
    private _note?: string;
    private _hidden: boolean = false;

    public Dirty: boolean = false;

    private constructor(obj: {
        id?: number,
        item: string,
        note?: string,
        order: number,
        hidden?: boolean,
        created?: number,
        updated?: number;
    }) {
        this._databaseId = obj.id;
        this._item = obj.item;
        this._note = obj.note;
        this._order = obj.order;
        this._hidden = obj.hidden ?? false;
        this._created = obj.created ?? Date.now();
        this._updated = obj.updated ?? Date.now();
    }

    /** get unique id in backend */
    public get Id(): number | undefined {
        return this._databaseId;
    }

    /** set the unique id for backend */
    public set Id(id: number) {
        this._databaseId = id;
    }

    /** get the order number */
    public get Order(): number {
        return this._order;
    }

    /** set the order number */
    public set Order(order: number) {
        if (this._order != order) {
            this._order = order;
            this.Dirty = true;
        }
    }

    /** get created timestamp */
    public get Created(): number {
        return this._created;
    }

    /** set created timestamp */
    public set Created(created: number) {
        this._created = created;
    }

    /** get updated timestamp */
    public get Updated(): number | undefined {
        return this._updated;
    }

    /** set updated timestamp */
    public set Updated(updated: number) {
        if (this._updated != updated) {
            this._updated = updated;
            this.Dirty = true;
        }
    }

    /** get the item text */
    public get Item(): string {
        return this._item;
    }

    /** set the item text */
    public set Item(item: string) {
        if (this._item != item) {
            this._item = item;
            this.Dirty = true;
        }
    }

    /** get the item note */
    public get Note(): string | undefined {
        return this._note;
    }

    /** set the item note */
    public set Note(note: string | undefined) {
        if (this._note != note) {
            this._note = note;
            this.Dirty = true;
        }
    }

    /** get the hidden state of the item */
    public get Hidden(): boolean {
        return this._hidden;
    }

    /** set the hidden state of the item */
    public set Hidden(hidden: boolean) {
        if (this._hidden != hidden) {
            this._hidden = hidden;
            this.Dirty = true;
        }
    }

    /**
     * create an object to send to a device
     * @returns device object representation
     */
    public toDeviceObject() {
        if (!this.Hidden) {
            return {
                item: this._item,
                note: this._note,
                order: this._order
            };
        }
        else {
            return null;
        }
    }

    /**
     * create an object to store in backend, returns undefined if to changes on the list
     * @param list_uuid unique identifier of the list, the item is part of
     * @param force force to create an object, even if nothing changed
     * @returns object for backend storage, undefined if no changes
     */
    public toBackend(list_uuid: string, force: boolean = false): ListitemModel | undefined {
        if (!this.Dirty && !force) {
            return undefined;
        }
        else {
            return {
                id: this._databaseId,
                list_uuid: list_uuid,
                item: this._item,
                note: this._note,
                order: this._order,
                hidden: this._hidden ? 1 : 0,
                created: this._created,
                updated: this._updated
            };
        }
    }

    /**
     * update item info from user input
     * @param obj user input object
     */
    public fromInput(obj: ListItemEditorReturn) {
        this.Item = obj.item;
        this.Note = obj.note;
        this.Updated = Date.now();
    }

    /**
     * string to identify list in logfiles
     * @returns
     */
    public toLog(): string {
        return `id:${this.Id ?? '?'}`;
    }

    /**
     * creates a listitem object from backend
     * @param obj backend object
     * @returns Listitem object
     */
    public static fromBackend(obj: any): Listitem | undefined {
        const props = ["id", "item", "created", "order"];
        for (let i = 0; i < props.length; i++) {
            if (!obj.hasOwnProperty(props[i])) {
                Logger.Error(`Could not read listitem from database, property ${props[i]} not found}`);
                return undefined;
            };
        }
        return new Listitem({
            id: obj.id,
            item: obj.item,
            note: obj.note,
            order: obj.order,
            hidden: obj.hidden == 1 ? true : false,
            created: obj.created,
            updated: obj.updated,
        });
    }

    /**
     * creates a new Listitem object from user input
     * @param obj user input
     * @returns Listitem object
     */
    public static Create(obj: any): Listitem {
        const item = new Listitem({
            item: obj.item,
            note: obj.note ?? undefined,
            order: 0
        });

        item.Dirty = true;
        return item;
    }
}

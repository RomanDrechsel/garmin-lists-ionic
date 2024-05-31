import { Logger } from "../../../logging/logger";
import { UpgradeStatement } from "../databases/database-base";
import { ListitemModel } from "../models/listitem-model";
import { DatabaseTableBase } from "./database-table-base";

export class ListitemsTable extends DatabaseTableBase {
    public readonly Tablename: string = "listitems";

    /**
     * upgrade statements for the table in the database
     * @returns array of UpgradeStatements
     */
    public VersionUpgradeStatements(): UpgradeStatement[] {
        let upgrades: UpgradeStatement[] = [
            {
                toVersion: 1,
                statements: [
                    `CREATE TABLE IF NOT EXISTS ${this.Tablename} (
                    id y PRIMARY KEY AUTOINCREMENT,
                    list_uuid TEXT,
                    item TEXT NOT NULL,
                    note TEXT,
                    'order' INTEGER NOT NULL,
                    hidden INTEGER,
                    created INTEGER NOT NULL,
                    updated INTEGER);`,
                    `CREATE INDEX IF NOT EXISTS idx_list_uuid ON ${this.Tablename} (list_uuid);`,
                    `CREATE INDEX IF NOT EXISTS idx_order ON ${this.Tablename} ('order')`,
                    `CREATE INDEX IF NOT EXISTS idx_hidden ON ${this.Tablename} (hidden);`,
                ],
            },
        ];

        return upgrades;
    }

    /**
     * get all items for a list
     * @param uuid unique id of the list
     * @returns array with listitem models, undefined if query failed
     */
    public async GetItems(uuid: string): Promise<ListitemModel[] | undefined> {
        const query = `SELECT * FROM ${this.Tablename} WHERE list_uuid=? ORDER BY 'order' ASC`;
        const result = await this.ReadQuery(query, [uuid]);
        if (result) {
            return result as ListitemModel[];
        } else if (result === false) {
            Logger.Error(`Could not read listitems for list ${uuid} from database in ${this.BackendIdentifier}`);
            return undefined;
        } else {
            return [];
        }
    }

    /**
     * stores a listitem in database
     * @param item listitem model to be stored
     * @returns id of the listitem in database, undefined in query failed
     */
    public async StoreItem(item: ListitemModel): Promise<number | undefined> {
        const query = `INSERT OR REPLACE INTO ${this.Tablename} (id, list_uuid, item, note, 'order', hidden, created, updated) VALUES(?,?,?,?,?,?,?,?)`;
        let result = await this.WriteQuery(query, [item.id ?? null, item.list_uuid, item.item, item.note ?? null, item.order, item.hidden, item.created, item.updated ?? null]);
        if (result !== false) {
            result = await this.ReadQuery("SELECT last_insert_rowid() AS id");
            if (result && result.length > 0 && result[0].id !== undefined) {
                return parseInt(result[0].id);
            }
        }

        return undefined;
    }

    /**
     * removes an item from database
     * @param id id of the item to be removed
     * @returns removal successful?
     */
    public async RemoveItem(id: number): Promise<boolean> {
        const query = `DELETE FROM  ${this.Tablename} WHERE id=?`;
        if ((await this.WriteQuery(query, [id])) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * removes all items of a list
     * @param list_uuid unique id of the list, the items should be removed
     * @returns removal successful?
     */
    public async RemoveList(list_uuid: string): Promise<boolean> {
        const query = `DELETE FROM  ${this.Tablename} WHERE list_uuid=?`;
        if ((await this.WriteQuery(query, [list_uuid])) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * get the totaCleanupOrphanedItemsl number of items for a list in database
     * @param list_uuid unique id of the list
     * @returns total number of items in the list
     */
    public async GetItemsCount(list_uuid: string): Promise<number> {
        const query = `SELECT COUNT(*) AS anz FROM ${this.Tablename} WHERE list_uuid=?`;
        const result = await this.ReadQuery(query, [list_uuid]);
        if (result && result.length > 0 && result[0].anz) {
            return parseInt(result[0].anz);
        } else {
            return 0;
        }
    }

    /**
     * deletes all entries in the table
     */
    public async Truncate(): Promise<boolean> {
        const query = `DELETE FROM ${this.Tablename}`;
        if ((await this.WriteQuery(query)) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * deletes all orphaned listitems, that are not part of any existing list
     * @param uuids uuids of all lists
     * @returns number of deleted listitems
     */
    public async CleanupOrphanedItems(uuids: string[]): Promise<number> {
        const query = `SELECT id, list_uuid FROM ${this.Tablename}`;
        const items = await this.ReadQuery(query);
        let del: string[] = [];
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.id && item.list_uuid && uuids.indexOf(item.list_uuid) < 0) {
                    del.push(String(item.id));
                }
            }
        }

        if (del.length > 0) {
            const del_query = `DELETE FROM ${this.Tablename} WHERE id IN (?)`;
            await this.WriteQuery(del_query, [del.join(",")]);
        }

        return del.length;
    }
}

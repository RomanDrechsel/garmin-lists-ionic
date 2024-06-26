import { UpgradeStatement } from "../databases/database-base";
import { ListitemModel } from "../models/listitem-model";
import { ListitemsTable } from "./listitems-table";

export class ListitemsTrashTable extends ListitemsTable {
    public override readonly Tablename: string = "listitems_trash";

    /**
     * upgrade statements for the table in the database
     * @returns array of UpgradeStatements
     */
    public override VersionUpgradeStatements(): UpgradeStatement[] {
        let upgrades: UpgradeStatement[] = [{
            toVersion: 3,
            statements: [
                `CREATE TABLE IF NOT EXISTS ${this.Tablename} (
                    id INTEGER PRIMARY KEY,
                    list_uuid TEXT,
                    item TEXT NOT NULL,
                    note TEXT,
                    'order' INTEGER NOT NULL,
                    hidden INTEGER,
                    created INTEGER NOT NULL,
                    updated INTEGER,
                    deleted INTEGER NOT NULL);`,
                `CREATE INDEX IF NOT EXISTS idx_list_uuid ON ${this.Tablename} (list_uuid);`,
                `CREATE INDEX IF NOT EXISTS idx_deleted ON ${this.Tablename} (deleted);`
            ]
        },
        ];
        return upgrades;
    }

    /**
     *store a listitem in trash
     * @param item item to be stored
     * @returns id of the item in database, undefined if query failed
     */
    public override async StoreItem(item: ListitemModel): Promise<number | undefined> {
        if (item.id != undefined) {
            const query = `INSERT OR REPLACE INTO ${this.Tablename} (id, list_uuid, item, note, 'order', hidden, created, updated, deleted) VALUES(?,?,?,?,?,?,?,?,?)`;
            let result = await this.WriteQuery(query, [item.id ?? null, item.list_uuid, item.item, item.note ?? null, item.order, item.hidden, item.created, item.updated ?? null, Date.now()]);
            if (result !== false) {
                return item.id;
            }
        }

        return undefined;
    }

    /**
     * removes all items which were deleted more than a certain amount of seconds ago
     * @param seconds number of seconds
     * @returns removal successful?
     */
    public async RemoveOldItems(seconds: number): Promise<number | false> {
        const query = `DELETE FROM ${this.Tablename} WHERE deleted < ?`;
        const ts = Math.floor(Date.now()) - (seconds * 1000);
        const result = await this.ReadQuery(query, [ts]);
        if (result !== false) {
            const changes = await this.Changes();
            if (changes) {
                return changes;
            }
            else {
                return -1;
            }
        }
        else {
            return false;
        }
    }
}

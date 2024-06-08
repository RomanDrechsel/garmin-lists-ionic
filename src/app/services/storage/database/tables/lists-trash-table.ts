import { Logger } from "../../../logging/logger";
import { UpgradeStatement } from "../databases/database-base";
import { MainDatabase } from "../databases/main-database";
import { ListModel } from "../models/list-model";
import { ListsTable } from "./lists-table";

export class ListsTrashTable extends ListsTable {
    public override readonly Tablename: string = "lists_trash";
    protected override readonly ItemTable: string = (this.Database as MainDatabase).ListitemsTrash.Tablename;

    /**
     * upgrade statements for the table in the database
     * @returns array of UpgradeStatements
     */
    public override VersionUpgradeStatements(): UpgradeStatement[] {
        let upgrades: UpgradeStatement[] = [
            {
                toVersion: 2,
                statements: [
                    `CREATE TABLE IF NOT EXISTS ${this.Tablename} (
                        uuid TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        'order' INTEGER NOT NULL,
                        created INTEGER NOT NULL,
                        updated INTEGER,
                        deleted INTEGER NOT NULL);`,
                    `CREATE INDEX IF NOT EXISTS idx_uuid ON ${this.Tablename} (uuid);`,
                    `CREATE INDEX IF NOT EXISTS idx_order ON ${this.Tablename} ('order');`,
                    `CREATE INDEX IF NOT EXISTS idx_deleted ON ${this.Tablename} (deleted);`,
                ],
            },
        ];
        return upgrades;
    }

    /**
     * store a list in trash database
     * @param list list model to be stored
     * @returns storage successful
     */
    public override async StoreList(list: ListModel): Promise<boolean> {
        const query = `INSERT OR REPLACE INTO ${this.Tablename} (uuid, name, 'order', created, updated, deleted) VALUES(?,?,?,?,?,?)`;
        if ((await this.WriteQuery(query, [list.uuid, list.name, list.order, list.created, list.updated, Date.now()])) !== false) {
            return true;
        }
        return false;
    }

    /**
     * remove a list from trash database
     * @param uuid unique list id
     * @returns removal successful
     */
    public override async RemoveList(uuid: string): Promise<boolean> {
        const query = `DELETE FROM ${this.Tablename} WHERE uuid=?`;
        if ((await this.WriteQuery(query, [uuid])) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * gets the uuids of all lists, which were deleted more than a certain amount of seconds ago
     * @param seconds older than seconds
     * @returns array of all uuids
     */
    public async GetOlderLists(seconds: number): Promise<string[]> {
        const query = `SELECT uuid FROM ${this.Tablename} WHERE deleted < ?`;
        const ts = Math.floor(Date.now()) - seconds * 1000;
        const result = await this.ReadQuery(query, [ts]);

        if (result && result.length > 0) {
            let uuids: string[] = [];
            result.forEach(res => {
                if (res.uuid) {
                    uuids.push(res.uuid);
                }
            });
            return uuids;
        } else {
            if (result === false) {
                Logger.Error(`Could not fetch old lists from database ${this.BackendIdentifier}`);
            }
            return [];
        }
    }

    /**
     * returns all lists that exceeds the limit
     * @param limit limit of lists
     * @returns excess lists
     */
    public async GetExcesses(limit: number): Promise<string[] | undefined> {
        const query = `SELECT uuid FROM ${this.Tablename} LIMIT -1 OFFSET ${limit}`;
        const result = await this.ReadQuery(query);
        if (result !== false) {
            if (result && result.length > 0) {
                let uuids: string[] = [];
                result.forEach(res => {
                    if (res.uuid) {
                        uuids.push(res.uuid);
                    }
                });
                return uuids;
            } else {
                return [];
            }
        } else {
            Logger.Error(`Could not fetch entries that exceeds the limit of ${limit} in ${this.BackendIdentifier}`);
            return undefined;
        }
    }

    /**
     * get the number of lists in trash
     * @returns number of lists in trash
     */
    public async Count(): Promise<number | undefined> {
        const query = `SELECT COUNT(*) as 'count' FROM ${this.Tablename}`;
        const result = await this.ReadQuery(query);
        if (result && result.length > 0 && result[0].count) {
            return parseInt(result[0].count);
        }
        return undefined;
    }
}

import { Logger } from "../../../logging/logger";
import { UpgradeStatement } from "../databases/database-base";
import { MainDatabase } from "../databases/main-database";
import { ListModel } from "../models/list-model";
import { DatabaseTableBase } from "./database-table-base";

export class ListsTable extends DatabaseTableBase {
    public readonly Tablename: string = "lists";
    protected readonly ItemTable: string = (this.Database as MainDatabase).ListItems.Tablename;

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
                        uuid TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        'order' INTEGER NOT NULL,
                        created INTEGER NOT NULL,
                        updated INTEGER);`,
                    `CREATE INDEX IF NOT EXISTS idx_uuid ON ${this.Tablename} (uuid);`,
                    `CREATE INDEX IF NOT EXISTS idx_order ON ${this.Tablename} ('order');`,
                ],
            },
        ];
        return upgrades;
    }

    /**
     * get al lists in database
     * @returns array of listmodels
     */
    public async GetLists(): Promise<ListModel[]> {
        const db = this.Database as MainDatabase;
        const query = `SELECT l.*,(SELECT COUNT(*) FROM ${this.ItemTable} WHERE list_uuid=l.uuid) AS itemscount FROM ${this.Tablename} AS l`;
        const result = await this.ReadQuery(query);
        if (result !== undefined && result !== false) {
            return result as ListModel[];
        } else {
            if (result === false) {
                Logger.Error(`Could not query lists from table ${this.BackendIdentifier}`);
            }
            return [];
        }
    }

    /**
     * get a specific list from database
     * @param uuid unique is of the list
     * @param check don't log, if the list doesn't exist
     * @returns list model, undefined if query failed of list not found
     */
    public async GetList(uuid: string, check: boolean = false): Promise<ListModel | undefined> {
        const query = `SELECT * FROM ${this.Tablename} WHERE uuid=? LIMIT 1`;
        const result = await this.ReadQuery(query, [uuid]);
        if (result && result.length > 0) {
            let ret = result[0] as ListModel;
            return ret;
        } else {
            if (result === false) {
                Logger.Error(`Could not read list ${uuid} from table ${this.BackendIdentifier}`);
            } else if (!check) {
                Logger.Error(`List ${uuid} not found in table ${this.BackendIdentifier}`);
            }
            return undefined;
        }
    }

    /**
     * gets the number of all lists in database
     * @returns number of all lists
     */
    public async GetNumLists(): Promise<number> {
        const query = `SELECT COUNT(*) as num FROM ${this.Tablename}`;
        const result = await this.ReadQuery(query);
        if (result && result.length > 0 && result[0].num) {
            return parseInt(result[0].num);
        } else {
            return 0;
        }
    }

    /**
     * store a list in database
     * @param list list model
     * @returns storage successful
     */
    public async StoreList(list: ListModel): Promise<boolean> {
        const query = `INSERT OR REPLACE INTO ${this.Tablename} (uuid, name, 'order', created, updated) VALUES(?,?,?,?,?)`;
        if ((await this.WriteQuery(query, [list.uuid, list.name, list.order, list.created, list.updated])) !== false) {
            return true;
        }
        return false;
    }

    /**
     * remove a list from database
     * @param uuid unique list id
     * @returns removal successful
     */
    public async RemoveList(uuid: string): Promise<boolean> {
        const query = `DELETE FROM ${this.Tablename} WHERE uuid=?`;
        if ((await this.WriteQuery(query, [uuid])) !== false) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * removes all specified lists from database
     * @param uuids array of all uuids
     * @returns number of removed lists
     */
    public async RemoveLists(uuids: string[]): Promise<number> {
        let count = 0;
        const query = `DELETE FROM ${this.Tablename} WHERE uuid=?`;
        for (let i = 0; i < uuids.length; i++) {
            if (await this.ReadQuery(query, [uuids[i]])) {
                count++;
            }
        }

        if (count > 0) {
            this.Database.Store();
        }

        return count;
    }

    /**
     * gets the uuids of all lists in database
     * @returns array of all uuids
     */
    public async GetUuids(): Promise<string[] | undefined> {
        const query = `SELECT uuid FROM ${this.Tablename}`;
        const result = await this.ReadQuery(query);
        if (result !== false) {
            if (result && result.length > 0) {
                let uuids: string[] = [];
                result.forEach(ds => {
                    if (ds.uuid) {
                        uuids.push(ds.uuid);
                    }
                });
                return uuids;
            } else {
                return [];
            }
        } else {
            return undefined;
        }
    }
}

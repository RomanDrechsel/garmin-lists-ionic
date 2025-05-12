import { inject, Injectable } from "@angular/core";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { List, type ListModel } from "../../../lists/list";
import { Listitem, ListitemModel } from "../../../lists/listitem";
import { Logger } from "../../../logging/logger";
import { SqliteUpgradeStatementsMain } from "./sqlite-upgrade-statments";
import { SqliteService } from "./sqlite.service";

@Injectable({
    providedIn: "root",
})
export class SqliteBackendService {
    public static readonly DatabaseNameMain = "main";

    private readonly _databaseVersion = 1;
    private _database!: SQLiteDBConnection;

    private readonly _sqliteService = inject(SqliteService);

    public MaxTrashCount: number | undefined = undefined;

    public async Initialize(): Promise<boolean> {
        await this._sqliteService.addUpgradeStatement(SqliteUpgradeStatementsMain());
        this._database = await this._sqliteService.openDatabase(SqliteBackendService.DatabaseNameMain, false, "no-encryption", this._databaseVersion, false);
        Logger.Debug(`Found ${await this.queryListsCount()} list(s) in backend`);
        return true;
    }

    public async queryLists(args: { peek?: boolean; trash?: boolean; orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<List[]> {
        if (!args.orderBy) {
            args.orderBy = "order";
        }
        if (!args.orderDir) {
            args.orderDir = "ASC";
        }

        const ret: List[] = [];
        const query = `SELECT * FROM \`lists\` WHERE \`deleted\` ${args.trash ? "IS NOT NULL" : "IS NULL"} ORDER BY \`${args.orderBy}\` ${args.orderDir}`;
        const lists = (await this._database.query(query)).values as ListModel[] | undefined;
        if (lists) {
            for (let i = 0; i < lists.length; i++) {
                if (args.peek === false) {
                    const queryItems = `SELECT * FROM \`listitems\` WHERE \`list_id\` = ? AND \`deleted\` IS NULL ORDER BY \`${args.orderBy}\` ${args.orderDir}`;
                    const items = (await this._database.query(queryItems, [lists[i].uuid])).values as ListitemModel[] | undefined;
                    if (!items) {
                        Logger.Error(`Could not query items of list ${List.toLog(lists[i])}`);
                    }
                    ret.push(new List(lists[i], items));
                } else {
                    const queryItems = `SELECT COUNT(*) AS \`count\` FROM \`listitems\` WHERE \`list_id\` = ? AND \`deleted\` IS NULL`;
                    const queryCount = (await this._database.query(queryItems, [lists[i].uuid])).values;
                    if (!queryCount) {
                        Logger.Error(`Could not query number of items of list ${List.toLog(lists[i])}`);
                    }
                    const count = Number(queryCount?.[0]?.count ?? 0);
                    ret.push(new List(lists[i], undefined, count));
                }
            }
        }

        return ret;
    }

    public async queryList(args: { list: List | number; peek?: boolean; itemsTrash?: boolean; itemsOrderBy?: ListsOrder; itemsOrderDir?: ListsOrderDirection }): Promise<List | undefined> {
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;

        let list: ListModel | undefined;

        try {
            const query = `SELECT * FROM \`lists\` WHERE \`uuid\` = ? AND \`deleted\` IS NULL LIMIT 1;`;
            const ret = (await this._database.query(query, [uuid])).values as ListModel[] | undefined;
            if (ret) {
                list = ret[0];
            } else {
                throw "Empty result";
            }
        } catch (e) {
            Logger.Error(`Could not query list uuid:${uuid} from backend: `, e);
            return undefined;
        }

        if (list) {
            if (!args.itemsOrderBy) {
                args.itemsOrderBy = "order";
            }
            if (!args.itemsOrderDir) {
                args.itemsOrderDir = "ASC";
            }
            let listitems: ListitemModel[] | undefined;
            try {
                const query = `SELECT * FROM \`listitems\` WHERE \`list_id\`=? AND deleted ${!args.itemsTrash ? "IS NULL" : "IS NOT NULL"} ORDER BY \`${args.itemsOrderBy}\` ${args.itemsOrderDir}`;
                listitems = (await this._database.query(query, [uuid])).values as ListitemModel[] | undefined;
                if (!listitems) {
                    throw "Empty result";
                }
            } catch (e) {
                Logger.Error(`Could not query listitems for list ${List.toLog(list)}: `, e);
                return undefined;
            }

            return new List(list, listitems);
        }

        return undefined;
    }

    public async queryListitems(args: { list: number | List; trash?: boolean; orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<Listitem[] | undefined> {
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        if (!args.orderBy) {
            args.orderBy = "order";
        }
        if (!args.orderDir) {
            args.orderDir = "ASC";
        }
        const query = `SELECT * FROM \`listitems\` WHERE \`list_id\`=? AND deleted ${!args.trash ? "IS NULL" : "IS NOT NULL"} ORDER BY \`${args.orderBy}\` ${args.orderDir}`;
        const models = (await this._database.query(query, [uuid])).values as ListitemModel[] | undefined;
        if (models) {
            const items: Listitem[] = [];
            models.forEach(m => {
                items.push(new Listitem(m));
            });
            return items;
        }

        return undefined;
    }

    public async queryListsCount(args?: { trash?: boolean }): Promise<number> {
        const query = `SELECT COUNT(*) AS \`count\` FROM \`lists\` WHERE \`deleted\` ${args?.trash ? "IS NOT NULL" : "IS NULL"} `;
        const count = (await this._database.query(query)).values;
        if (!count) {
            Logger.Error(`Failed to query backend: queryListsCount()`);
            return 0;
        }
        return Number(count[0].count);
    }

    public async queryListitemsCount(args: { list?: number | List; trash?: boolean }): Promise<number> {
        //TODO: SqliteBackendService.queryListitemsCount()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.queryListitemsCount()");
        return 0;
    }

    public async storeList(args: { list: List; force?: boolean }): Promise<number | false | undefined> {
        if (args.force !== true && !args.list.Dirty && !args.list.isVirtual) {
            return undefined;
        }

        if (args.list.isPeek) {
            const copy = await this.queryList({ list: args.list.Uuid });
            if (copy) {
                args.list.copyDetails(copy);
            }
        }

        const backend = args.list.toBackend();

        await this._database.beginTransaction();
        if (!(await this._database.isTransactionActive())) {
            Logger.Error(`Could not start sql transaction in 'SqliteBackendService.storeList()'`);
            return false;
        }

        let list_uuid: number | undefined = undefined;

        try {
            if (args.list.isVirtual) {
                backend.delete("uuid");
                const keys = "`" + Array.from(backend.keys()).join("`, `") + "`";
                const qms = Array.from(backend.keys())
                    .map(() => "?")
                    .join(", ");
                const query = `INSERT INTO \`lists\` (${keys}) VALUES (${qms})`;
                const ret = await this._database.run(query, Array.from(backend.values()), false);
                list_uuid = ret.changes?.lastId;
            } else {
                const query = `UPDATE \`lists\` SET ${Array.from(backend.keys())
                    .map(key => `\`${key}\`=?`)
                    .join(", ")} WHERE \`uuid\`=${args.list.Uuid}`;
                await this._database.run(query, Array.from(backend.values()), false);
                list_uuid = args.list.Uuid;
            }

            const uuid_map = new Map<number, number>();
            if (list_uuid) {
                for (let i = 0; i < args.list.Items.length; i++) {
                    const item = args.list.Items[i];
                    if (item.isVirtual || item.Dirty || args.force) {
                        const itemBackend = item.toBackend();
                        itemBackend.set("list_id", list_uuid);
                        if (item.isVirtual) {
                            itemBackend.delete("uuid");
                            const keys = "`" + Array.from(itemBackend.keys()).join("`, `") + "`";
                            const qms = Array.from(itemBackend.keys())
                                .map(() => "?")
                                .join(", ");
                            const query = `INSERT INTO \`listitems\` (${keys}) VALUES (${qms})`;
                            const ret = await this._database.run(query, Array.from(itemBackend.values()), false);
                            if (ret.changes?.lastId) {
                                uuid_map.set(item.Uuid, ret.changes.lastId);
                            }
                        } else {
                            const query = `UPDATE \`listitems\` SET ${Array.from(itemBackend.keys())
                                .map(key => `\`${key}\`=?`)
                                .join(", ")} WHERE \`uuid\`=${item.Uuid}`;
                            await this._database.run(query, Array.from(itemBackend.values()), false);
                        }
                    }
                }
            } else {
                throw "no uuid";
            }

            await this._database.commitTransaction();
            args.list.Uuid = list_uuid;
            uuid_map.forEach((val: number, key: number) => {
                const item = args.list.Items.find(i => i.Uuid == key);
                if (item) {
                    item.Uuid = val;
                }
            });
            args.list.Clean();
        } catch (e) {
            await this._database.rollbackTransaction();
            Logger.Error(`Could not store list ${args.list.toLog()} in backend:`, e);
            return false;
        }

        return list_uuid;
    }

    public async emptyList(args?: { list?: number | List; trash?: boolean; forceAll?: boolean }): Promise<boolean> {
        //TODO: SqliteBackendService.emptyList()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.emptyList()");
        return false;
    }

    public async moveListsToTrash(args?: { lists?: number[] | List[] }): Promise<boolean> {
        //TODO: SqliteBackendService.moveToTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.moveToTrash()");
        return false;
    }

    public async deleteLists(args?: { lists?: number | List | number[] | List[]; trash?: boolean }): Promise<number> {
        //TODO: SqliteBackendService.deleteList()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.deleteList()");
        return 0;
    }

    public async moveListitemsToTrash(args: { list: number | List; items?: number[] | Listitem[]; force?: boolean }): Promise<number | false> {
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;

        if (args.items?.length && typeof args.items[0] === "number" && args.force !== true) {
            //we need the listitem object, to check if they are locked...
            const query = `SELECT * FROM \`listitems\` WHERE \`list_id\` = ? AND \`deleted\` IS NULL AND \`uuid\` IN (${args.items.map(i => "?").join(", ")})`;
            const models = (await this._database.query(query, [uuid, ...args.items])).values as ListitemModel[] | undefined;
            if (models) {
                const items: Listitem[] = [];
                models.forEach(m => {
                    items.push(new Listitem(m));
                });
                args.items = items.filter(i => !i.Locked);
            }
        }

        const item_uuids = args.items?.map(i => (typeof i === "number" ? i : i.Uuid)) || [];

        let query = "UPDATE `listitems` SET `deleted` = ? WHERE `list_id` = ? AND `deleted` IS NULL";
        if (args.items?.length) {
            query += ` AND \`uuid\` IN (` + item_uuids.map(i => "?").join(", ") + `)`;
        }

        const ret = await this._database.run(query, [Date.now(), uuid, ...item_uuids]);
        if (ret.changes?.changes) {
            return ret.changes.changes;
        }

        return false;
    }

    public async deleteListitems(args: { list: number | List; items?: number[] | Listitem[]; trash?: boolean }): Promise<number | false> {
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const item_uuids = args.items?.map(i => (typeof i === "number" ? i : i.Uuid)) || [];
        const query = `DELETE FROM \`listitems\` WHERE \`list_id\` = ? AND \`deleted\` ${args.trash !== false ? "IS NOT NULL" : "IS NULL"} AND \`uuid\` IN (` + item_uuids.map(i => "?").join(", ") + `)`;
        const ret = await this._database.run(query, [uuid, ...item_uuids]);
        if (ret.changes?.changes) {
            return ret.changes.changes;
        }

        return false;
    }

    public async deleteAllListitems(args?: { lists?: number[] | List[]; trash?: boolean; force?: boolean }): Promise<number | false> {
        //TODO: SqliteBackendService.deleteAllListitems()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.deleteAllListitems()");
        return 0;
    }

    public async restoreListsFromTrash(args?: { lists: number[] | List[] }): Promise<number> {
        //TODO: SqliteBackendService.restoreListsFromTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.restoreListsFromTrash()");
        return 0;
    }

    public async restoreListitemsFromTrash(args?: { list: number | List; items?: number[] | Listitem[] }): Promise<number> {
        //TODO: SqliteBackendService.restoreListitemsFromTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.restoreListitemsFromTrash()");
        return 0;
    }

    public async removeOldTrash(args: { olderThan?: number; maxCount?: number }): Promise<number> {
        //TODO: SqliteBackendService.removeOldTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.removeOldTrash()");
        return 0;
    }

    public async getNextListOrder(): Promise<number> {
        const query = `SELECT \`order\` FROM \`lists\` WHERE \`deleted\` IS NULL ORDER BY \`order\` DESC LIMIT 1`;
        const ret = await this._database.query(query);
        if (ret.values?.[0]?.order) {
            return ret.values[0].order + 1;
        }
        return 0;
    }

    public async getNextListitemOrder(args: { list: number | List }): Promise<number> {
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const query = `SELECT \`order\` FROM \`listitems\` WHERE \`list_id\`=? AND \`deleted\` IS NULL ORDER BY \`order\` DESC LIMIT 1`;
        const ret = await this._database.query(query, [uuid]);
        if (ret.values?.[0]?.order) {
            ret.values[0].order + 1;
        }
        return 0;
    }
}

export type ListsOrder = "created" | "modified" | "deleted" | "order";
export type ListsOrderDirection = "ASC" | "DESC";
export type DatabaseType = string | number | null;

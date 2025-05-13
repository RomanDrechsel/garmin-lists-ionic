import { inject, Injectable } from "@angular/core";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { List, type ListModel } from "../../lists/list";
import { Listitem, ListitemModel } from "../../lists/listitem";
import { Logger } from "../../logging/logger";
import { SqliteService } from "../sqlite/sqlite.service";
import { MainUpgradeStatements } from "./main-upgrade-statments";

@Injectable({
    providedIn: "root",
})
export class MainSqliteBackendService {
    public static readonly DatabaseNameMain = "main";

    private readonly _databaseVersion = 1;
    private _database?: SQLiteDBConnection;

    private readonly _sqliteService = inject(SqliteService);

    public MaxTrashCount: number | undefined = undefined;

    public async Initialize(): Promise<boolean> {
        await this._sqliteService.addUpgradeStatement(MainUpgradeStatements());
        try {
            this._database = await this._sqliteService.openDatabase(MainSqliteBackendService.DatabaseNameMain, false, "no-encryption", this._databaseVersion, false);
        } catch (e) {
            this._database = undefined;
            Logger.Error("Error opening main database", e);
            return false;
        }
        Logger.Debug(`Found ${await this.queryListsCount()} list(s) in backend`);
        return true;
    }

    public async queryLists(args: { peek?: boolean; trash?: boolean; orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<List[]> {
        if (!this._database) {
            return [];
        }

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
        if (!this._database) {
            return undefined;
        }
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
        if (!this._database) {
            return undefined;
        }

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
        if (!this._database) {
            return 0;
        }
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
        if (!this._database) {
            return false;
        }

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

        try {
            await this._database.beginTransaction();
            if (!(await this._database.isTransactionActive())) {
                Logger.Error(`Could not start sql transaction in 'SqliteBackendService.storeList()'`);
                return false;
            }
        } catch (e) {
            Logger.Error(`Could not start sql transaction in 'SqliteBackendService.storeList()'`, e);
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

    public async moveListsToTrash(args: { lists?: number[] | List[] }): Promise<number | false> {
        if (!this._database) {
            return false;
        }

        const uuids = args.lists?.map(l => (l instanceof List ? l.Uuid : l)) ?? [];
        let query = `UPDATE \`lists\` SET \`deleted\` = ? WHERE \`deleted\` IS NULL`;
        if (uuids.length > 0) {
            query += ` AND \`uuid\` IN (${uuids.map(u => `?`).join(", ")})`;
        }

        try {
            const res = await this._database.run(query, [Date.now(), ...uuids]);
            if (res.changes?.changes) {
                return res.changes.changes;
            }
        } catch (e) {
            Logger.Error(`MainSqliteBackendService.moveListsToTrash() failed: `, e, uuids);
        }

        return false;
    }

    public async deleteLists(args: { lists?: number[] | List[]; trash?: boolean }): Promise<number | false> {
        if (!this._database) {
            return false;
        }

        //WIP: Test this

        try {
            await this._database.beginTransaction();
            if (!(await this._database.isTransactionActive())) {
                Logger.Error(`Could not start sql transaction in 'SqliteBackendService.deleteLists()'`);
                return false;
            }
        } catch (e) {
            Logger.Error(`Could not start sql transaction in 'SqliteBackendService.deleteLists()'`, e);
            return false;
        }

        const uuids = args.lists?.map(l => (l instanceof List ? l.Uuid : l)) ?? [];
        let query = `DELETE FROM \`lists\` WHERE \`deleted\` ${args.trash === false ? "IS NULL" : "IS NOT NULL"}`;
        if (uuids.length > 0) {
            query += " AND `uuid` IN (" + uuids.map(() => "?").join(",") + ")";
        }

        try {
            const ret = await this._database.run(query, uuids, false);
            if (ret.changes?.changes && ret.changes?.changes > 0) {
                query = "DELETE FROM `listitems` WHERE `list_id` IN (" + uuids.map(() => "?").join(",") + ")";
                await this._database.run(query, uuids, false);
            }
            await this._database.commitTransaction();

            return ret.changes?.changes ?? 0;
        } catch (e) {
            await this._database.rollbackTransaction();
            Logger.Error(`Could not delete ${args.lists?.length ?? "all"} list(s) in backend:`, e);
            return false;
        }
    }

    public async moveListitemsToTrash(args: { list: number | List; items?: number[] | Listitem[]; force?: boolean }): Promise<number | false> {
        if (!this._database) {
            return false;
        }
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const item_uuids = args.items?.map(i => (typeof i === "number" ? i : i.Uuid)) || [];

        let query = "UPDATE `listitems` SET `deleted` = ? WHERE `list_id` = ? AND `deleted` IS NULL";
        if (args.items?.length) {
            query += ` AND \`uuid\` IN (` + item_uuids.map(i => "?").join(", ") + `)`;
        }
        if (args.force !== true) {
            query += " AND `locked` <> 1";
        }

        try {
            const ret = await this._database.run(query, [Date.now(), uuid, ...item_uuids]);
            if (ret.changes?.changes) {
                await this.updateListModified({ list: args.list });
                return ret.changes.changes;
            }
            return 0;
        } catch (e) {
            Logger.Error(`MainSqliteBackendService.moveListitemsToTrash() failed: `, e);
            return false;
        }
    }

    public async deleteListitems(args: { list: number | List; items?: number[] | Listitem[]; trash?: boolean; force?: boolean }): Promise<number | false> {
        if (!this._database) {
            return false;
        }

        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const item_uuids = args.items?.map(i => (typeof i === "number" ? i : i.Uuid)) || [];

        let query = `DELETE FROM \`listitems\` WHERE \`list_id\` = ? AND \`deleted\` ${args.trash === true ? "IS NOT NULL" : "IS NULL"}`;

        if (item_uuids.length > 0) {
            query += ` AND \`uuid\` IN (` + item_uuids.map(i => "?").join(", ") + `)`;
        }
        if (args.trash !== true && args.force !== true) {
            query += " AND `locked` <> 1";
        }

        const ret = await this._database.run(query, [uuid, ...item_uuids]);
        if (ret.changes?.changes) {
            if (args.trash === false) {
                await this.updateListModified({ list: args.list });
            }
            return ret.changes.changes;
        }

        return false;
    }

    public async restoreListsFromTrash(args: { lists?: number[] | List[] }): Promise<number | false> {
        if (!this._database) {
            return false;
        }

        const uuids = args.lists?.map(l => (typeof l === "number" ? l : l.Uuid)) ?? [];

        let query = `UPDATE \`lists\` SET \`deleted\` = NULL, \`modified\` = ? WHERE \`deleted\` IS NOT NULL`;
        if (uuids.length > 0) {
            query += ` AND \`uuid\` IN (${uuids.map(() => "?").join(",")})`;
        }

        try {
            const ret = await this._database.run(query, [Date.now(), ...uuids]);
            if (ret.changes?.changes) {
                return ret.changes.changes;
            }
            return 0;
        } catch (e) {
            Logger.Error("MainSqliteBackendService.restoreListsFromTrash() failed", e, uuids);
            return false;
        }
    }

    public async restoreListitemsFromTrash(args: { list: number | List; items?: number[] | Listitem[] }): Promise<number> {
        if (!this._database) {
            return -1;
        }
        let start_order = await this.getNextListitemOrder({ list: args.list });
        const list_uuid = typeof args.list === "number" ? args.list : args.list.Uuid;
        const item_uuids = args.items?.map(i => (typeof i === "number" ? i : i.Uuid)) || [];
        let query = `UPDATE \`listitems\` SET \`deleted\` = NULL WHERE \`list_id\` = ?`;
        if (item_uuids.length > 0) {
            query += ` AND \`uuid\` IN (${item_uuids.map(i => "?").join(", ")})`;
        }
        let updated = 0;
        try {
            const res = await this._database.run(query, [list_uuid, ...item_uuids]);
            if (res.changes?.changes) {
                updated = res.changes?.changes;
            }
        } catch (e) {
            Logger.Error("SqliteBackendService.restoreListitemsFromTrash() failed", e, args);
            return -1;
        }

        if (updated > 0) {
            for (let i = 0; i < item_uuids.length; i++) {
                query = `UPDATE \`listitems\` SET \`order\` = ?, \`modified\` = ? WHERE \`list_id\` = ? AND \`uuid\` = ?`;
                await this._database.run(query, [start_order++, Date.now(), list_uuid, item_uuids[i]]);
            }
            await this.updateListModified({ list: args.list });
        }

        return updated;
    }

    public async wipeListitems(args?: { trash?: boolean }): Promise<number | false> {
        //TODO: SqliteBackendService.wipeListitems()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.wipeListitems()");
        return 0;
    }

    public async removeOldTrash(args: { olderThan?: number; maxCount?: number }): Promise<number> {
        //TODO: SqliteBackendService.removeOldTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.removeOldTrash()");
        return 0;
    }

    public async getNextListOrder(): Promise<number> {
        if (!this._database) {
            return 0;
        }

        const query = `SELECT \`order\` FROM \`lists\` WHERE \`deleted\` IS NULL ORDER BY \`order\` DESC LIMIT 1`;
        try {
            const ret = await this._database.query(query);
            if (ret.values?.[0]?.order) {
                return ret.values[0].order + 1;
            }
        } catch (e) {
            Logger.Error("MainSqliteBackendService.getNextListOrder() failed", e);
        }
        return 0;
    }

    public async getNextListitemOrder(args: { list: number | List }): Promise<number> {
        if (!this._database) {
            return 0;
        }

        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const query = `SELECT \`order\` FROM \`listitems\` WHERE \`list_id\`=? AND \`deleted\` IS NULL ORDER BY \`order\` DESC LIMIT 1`;
        try {
            const ret = await this._database.query(query, [uuid]);
            if (ret.values?.[0]?.order) {
                return ret.values[0].order + 1;
            }
        } catch (e) {
            Logger.Error(`MainSqliteBackendService.getNextListitemOrder failed:`, e);
        }
        return 0;
    }

    private async updateListModified(args: { list: number | List }): Promise<void> {
        if (!this._database) {
            return;
        }
        const uuid = args.list instanceof List ? args.list.Uuid : args.list;
        const query = `UPDATE \`lists\` SET \`modified\` = ? WHERE \`uuid\` = ?`;
        await this._database.run(query, [Date.now(), uuid]);
    }
}

export type ListsOrder = "created" | "modified" | "deleted" | "order";
export type ListsOrderDirection = "ASC" | "DESC";
export type DatabaseType = string | number | null;

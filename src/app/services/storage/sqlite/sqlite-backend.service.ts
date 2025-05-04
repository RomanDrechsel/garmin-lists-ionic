import { inject, Injectable } from "@angular/core";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { List } from "../../lists/list";
import type { Listitem } from "../../lists/listitem";
import { Logger } from "../../logging/logger";
import { SqliteUpgradeStatementsMain } from "./sqlite-upgrade-statments";
import { SqliteService } from "./sqlite.service";

@Injectable({
    providedIn: "root",
})
export class SqliteBackendService {
    public static readonly DatabaseNameMain = "main";

    private readonly _databaseVersion = 1;
    private _databaseConnection!: SQLiteDBConnection;

    private readonly _sqliteService = inject(SqliteService);

    public MaxTrashCount: number | undefined = undefined;

    public async Initialize(): Promise<boolean> {
        await this._sqliteService.addUpgradeStatement(SqliteUpgradeStatementsMain());
        this._databaseConnection = await this._sqliteService.openDatabase(SqliteBackendService.DatabaseNameMain, false, "no-encryption", this._databaseVersion, false);
        Logger.Debug(`Found ${await this.queryListsCount()} list(s) in backend`);
        return true;
    }

    public async queryLists(args: { peek?: boolean; trash?: boolean; orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<List[]> {
        //TODO: SqliteBackendService.queryLists()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.queryLists()");
        return [];
    }

    public async queryList(uuid: number): Promise<List | undefined> {
        //TODO: SqliteBackendService.queryList()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.queryList()");
        return undefined;
    }

    public async queryListitems(args: { list: number | List; trash?: boolean; orderBy?: ListsOrder; orderDir?: ListsOrderDirection }): Promise<Listitem[]> {
        //TODO: SqliteBackendService.queryListitems()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.queryListitems()");
        return [];
    }

    public async queryListsCount(args?: { trash?: boolean }): Promise<number> {
        //TODO: SqliteBackendService.queryListsCount()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.queryListsCount()");
        return 0;
    }

    public async storeList(args: { list: List; force?: boolean }): Promise<number | undefined> {
        //TODO: SqliteBackendService.storeList()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.storeList()");
        return undefined;
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

    public async moveListitemsToTrash(args?: { list?: number | List; items?: number[] | Listitem[]; force?: boolean }): Promise<boolean> {
        //TODO: SqliteBackendService.moveListitemsToTrash()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.moveListitemsToTrash()");
        return false;
    }

    public async deleteListitems(args: { list: number | List; items?: number[] | Listitem[]; trash?: boolean }): Promise<number> {
        //TODO: SqliteBackendService.deleteListitems()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.deleteListitems()");
        return 0;
    }

    public async deleteAllListitems(args?: { lists?: number[] | List[]; force?: boolean }): Promise<boolean> {
        //TODO: SqliteBackendService.deleteAllListitems()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.deleteAllListitems()");
        return false;
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
        //TODO: SqliteBackendService.getNextListOrder()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.getNextListOrder()");
        return 0;
    }

    public async getNextListitemOrder(args: { list: number | List }): Promise<number> {
        //TODO: SqliteBackendService.getNextListitemOrder()
        Logger.Debug("NOT IMPLEMENTED YET: SqliteBackendService.getNextListitemOrder()");
        return 0;
    }
}

export type ListsOrder = "created" | "modified" | "deleted" | "order";
export type ListsOrderDirection = "asc" | "desc";

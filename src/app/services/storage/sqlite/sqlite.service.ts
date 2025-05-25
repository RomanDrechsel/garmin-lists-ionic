import { Injectable } from "@angular/core";
import { CapacitorSQLite, type CapacitorSQLitePlugin, type capSQLiteUpgradeOptions, SQLiteConnection, type SQLiteDBConnection } from "@capacitor-community/sqlite";

@Injectable({
    providedIn: "root",
})
export class SqliteService {
    private readonly _sqlitePlugin!: CapacitorSQLitePlugin;

    private _sqliteConnection!: SQLiteConnection;

    constructor() {
        this._sqlitePlugin = CapacitorSQLite;
        this._sqliteConnection = new SQLiteConnection(this._sqlitePlugin);
    }

    public async addUpgradeStatement(options: capSQLiteUpgradeOptions): Promise<void> {
        await this._sqlitePlugin.addUpgradeStatement(options);
    }

    public async openDatabase(dbName: string, encrypted: boolean, mode: string, version: number, readonly: boolean = false): Promise<SQLiteDBConnection> {
        let db: SQLiteDBConnection;
        const retCC = (await this._sqliteConnection.checkConnectionsConsistency()).result;
        let isConn = (await this._sqliteConnection.isConnection(dbName, readonly)).result;
        if (retCC && isConn) {
            db = await this._sqliteConnection.retrieveConnection(dbName, readonly);
        } else {
            db = await this._sqliteConnection.createConnection(dbName, encrypted, mode, version, readonly);
        }
        await db.open();
        return db;
    }
}

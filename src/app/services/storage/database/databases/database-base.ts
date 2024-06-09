import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { AppService } from "../../../app/app.service";
import { Logger } from "../../../logging/logger";
import { DatabaseService } from "../../database.service";
import { DatabaseTableBase } from "../tables/database-table-base";

export abstract class DatabaseBase {
    public abstract readonly Name: string;
    protected Db?: SQLiteDBConnection;

    constructor(public Service: DatabaseService) {}

    public abstract GetAllTables(): DatabaseTableBase[];

    /**
     * upgrade statements for all tables in the database
     * @returns array of UpgradeStatements
     */
    public VersionUpgradeStatements(): UpgradeStatement[] {
        let versions: UpgradeStatement[] = [];

        const tables = this.GetAllTables();
        for (let i = 0; i < tables.length; i++) {
            const v = tables[i].VersionUpgradeStatements();
            v.forEach(el => {
                const i = versions.findIndex(v => v.toVersion == el.toVersion);
                if (i >= 0) {
                    versions[i].statements = versions[i].statements.concat(el.statements);
                } else {
                    versions.push(el);
                }
            });
        }
        return versions;
    }

    /**
     * get the sqlite database connection object
     * @returns SQLiteDBConnection
     */
    public async getConnection(): Promise<SQLiteDBConnection> {
        if (!this.Db) {
            this.Db = await this.Service.Connection.getConnection(this, false);
        }

        return this.Db;
    }

    /**
     * query the database
     * @param args
     * @returns
     */
    public async Query(args: { table?: DatabaseTableBase; query: string; values?: any[]; store?: boolean }): Promise<any[] | undefined | false> {
        try {
            const res = await (await this.getConnection()).query(args.query, args.values);
            if (args.store) {
                await this.Store();
            }
            return res.values;
        } catch (error) {
            if (args.table) {
                Logger.Error(`Could not query database ${this.Name}.${args.table.Tablename} with query "${args.query}": `, error);
            } else {
                Logger.Error(`Could not query database ${this.Name} with query "${args.query}": `, error);
            }
            return false;
        }
    }

    /**
     * store the database on storage, only needed on web
     */
    public async Store() {
        if (AppService.isWebApp) {
            await this.Service.Connection.saveToStore(this.Name);
        }
    }
}

export declare type UpgradeStatement = {
    toVersion: number;
    statements: string[];
};

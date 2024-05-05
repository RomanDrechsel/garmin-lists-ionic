import { DatabaseBase, UpgradeStatement } from "../databases/database-base";

export abstract class DatabaseTableBase {
    public abstract readonly Tablename: string;

    constructor(private database: DatabaseBase) { }

    /**
     * get database object
     */
    public get Database(): DatabaseBase {
        return this.database;
    }

    /**
     * get full string representation of the table in database
     */
    public get BackendIdentifier(): string {
        return `${this.database.Name}.${this.Tablename}`;
    }

    /**
     * upgrade statements for the table in the database
     * @returns array of UpgradeStatements
     */
    public abstract VersionUpgradeStatements(): UpgradeStatement[];

    /**
     * query the database and manipulate it, store it afterwards
     * @param query SQLite query string
     * @param params parameters for the query
     * @returns query results, false if the query failed
     */
    public async WriteQuery(query: string, params?: any[]): Promise<any[] | undefined | false> {
        return this.Database.Query({ table: this, query: query, values: params, store: true });
    }

    /**
     * query the database without manipulation, don't store it afterwards
     * @param query SQLite query string
     * @param params parameters for the query
     * @returns query results, false if the query failed
     */
    public async ReadQuery(query: string, params?: any[]): Promise<any[] | undefined | false> {
        return this.Database.Query({ table: this, query: query, values: params, store: false });
    }

    /**
     * returns the number of modified datasets by the last query
     * @returns number of modified datasets
     */
    public async Changes(): Promise<number | undefined> {
        const query = `SELECT changes() as anz`;
        const result = await this.ReadQuery(query);
        if (result && result.length > 0 && result[0].anz) {
            return parseInt(result[0].anz);
        }
        else {
            return undefined;
        }
    }
}

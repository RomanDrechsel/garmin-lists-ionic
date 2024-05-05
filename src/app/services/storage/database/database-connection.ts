import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { AppService } from "../../app/app.service";
import { Logger } from "../../logging/logger";
import { DatabaseBase } from "./databases/database-base";

export class DatabaseConnection {
    protected readonly DatabaseVersion = 3;
    protected SQLite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);

    public async Initialize(): Promise<void> {
        if (AppService.isWebApp) {
            await this.SQLite.initWebStore();
        }
        CapacitorSQLite.addSQLiteSuffix;
    }

    public async getConnection(database: DatabaseBase, readonly: boolean = false, encryption_passphrase?: string): Promise<SQLiteDBConnection> {
        const retCC = (await this.SQLite.checkConnectionsConsistency()).result;
        const isConn = (await this.SQLite.isConnection(database.Name, readonly)).result;

        let encrypted: boolean = !AppService.isWebApp && encryption_passphrase != undefined;
        if (encrypted) {
            const encryption_config = (await this.SQLite.isInConfigEncryption()).result;
            if (!encryption_config) {
                encrypted = false;
            }
        }

        if (encrypted && encryption_passphrase) {
            if (!(await this.SQLite.isSecretStored()).result) {
                await this.SQLite.setEncryptionSecret(encryption_passphrase);
            }
        }

        let connection: SQLiteDBConnection;
        if (retCC && isConn) {
            connection = await this.SQLite.retrieveConnection(database.Name, readonly);
        }
        else {
            await this.SQLite.addUpgradeStatement(database.Name, database.VersionUpgradeStatements());
            connection = await this.SQLite.createConnection(database.Name, encrypted, encrypted ? "secret" : "no-encryption", this.DatabaseVersion, readonly);
            Logger.Debug(`Created connection to database ${database.Name}:`, { encrypted: encrypted, readonly: readonly });
        }

        await connection.open();
        return connection;
    }

    public async saveToStore(database: string) {
        await this.SQLite.saveToStore(database);
    }
}

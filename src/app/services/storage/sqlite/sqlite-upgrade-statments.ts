import type { capSQLiteUpgradeOptions } from "@capacitor-community/sqlite";
import { SqliteBackendService } from "./sqlite-backend.service";

export const SqliteUpgradeStatementsMain = (): capSQLiteUpgradeOptions => {
    return {
        database: SqliteBackendService.DatabaseNameMain,
        upgrade: [
            {
                toVersion: 1,
                statements: [
                    `CREATE TABLE IF NOT EXISTS lists(
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    trash INTEGER DEFAULT 1 NOT NULL,
                    order INTEGER NOT NULL,
                    created DATETIME NOT NULL,
                    modified DATETIME,
                    sync INTEGER DEFAULT 0 NOT NULL,
                    deleted DATETIME,
                    reset INTEGER DEFAULT 0 NOT NULL,
                    reset_interval TEXT,
                    reset_hour INTEGER,
                    reset_minute INTEGER,
                    reset_day INTEGER,
                    reset_weekday INTEGER,
                    legacy_uuid TEXT
                )`,
                    `CREATE TABLE IF NOT EXISTS listitems(
                    id INTEGER PRIMARY KEY,
                    list_id INTEGER NOT NULL,
                    item TEXT NOT NULL,
                    note TEXT,
                    order INTEGER NOT NULL,
                    hidden INTEGER DEFAULT 0 NOT NULL,
                    locked INTEGER DEFAULT 0 NOT NULL,
                    created DATETIME NOT NULL,
                    modified DATETIME,
                    deleted DATETIME,
                    legacy_uuid TEXT
                )`,
                ],
            },
        ],
    };
};

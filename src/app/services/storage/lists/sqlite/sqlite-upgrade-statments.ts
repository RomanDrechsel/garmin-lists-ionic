import type { capSQLiteUpgradeOptions } from "@capacitor-community/sqlite";
import { SqliteBackendService } from "./sqlite-backend.service";

export const SqliteUpgradeStatementsMain = (): capSQLiteUpgradeOptions => {
    return {
        database: SqliteBackendService.DatabaseNameMain,
        upgrade: [
            {
                toVersion: 1,
                statements: [
                    `CREATE TABLE IF NOT EXISTS \`lists\` (
                    \`uuid\` INTEGER PRIMARY KEY AUTOINCREMENT,
                    \`name\` TEXT NOT NULL,
                    \`order\` INTEGER NOT NULL,
                    \`created\` REAL NOT NULL,
                    \`modified\` REAL NOT NULL,
                    \`deleted\` REAL,
                    \`sync\` INTEGER NOT NULL,
                    \`reset\` INTEGER NOT NULL,
                    \`reset_interval\` TEXT,
                    \`reset_hour\` INTEGER,
                    \`reset_minute\` INTEGER,
                    \`reset_day\` INTEGER,
                    \`reset_weekday\` INTEGER,
                    \`legacy_uuid\` TEXT
                )`,
                    `CREATE TABLE IF NOT EXISTS \`listitems\` (
                    \`uuid\` INTEGER PRIMARY KEY AUTOINCREMENT,
                    \`list_id\` INTEGER NOT NULL,
                    \`item\` TEXT NOT NULL,
                    \`note\` TEXT,
                    \`order\` INTEGER NOT NULL,
                    \`hidden\` INTEGER,
                    \`locked\` INTEGER,
                    \`created\` REAL NOT NULL,
                    \`modified\` REAL NOT NULL,
                    \`deleted\` REAL,
                    \`legacy_uuid\` TEXT
                )`,
                    `CREATE INDEX IF NOT EXISTS \`idx_order\` ON \`lists\` (\`order\`)`,
                    `CREATE INDEX IF NOT EXISTS \`idx_deleted\` ON \`lists\` (\`deleted\`)`,
                    `CREATE INDEX IF NOT EXISTS \`idx_order\` ON \`listitems\` (\`order\`)`,
                    `CREATE INDEX IF NOT EXISTS \`idx_deleted\` ON \`listitems\` (\`deleted\`)`,
                    `CREATE INDEX IF NOT EXISTS \`idx_list_id\` ON \`listitems\` (\`list_id\`)`,
                ],
            },
        ],
    };
};

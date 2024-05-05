import { Injectable } from '@angular/core';
import { interval } from "rxjs";
import { AppService } from "../app/app.service";
import { DatabaseConnection } from "./database/database-connection";
import { MainDatabase } from "./database/databases/main-database";

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private mainDb?: MainDatabase;
    public readonly Connection: DatabaseConnection = new DatabaseConnection();

    /**
     * get main database
     */
    public get MainDb(): MainDatabase {
        if (!this.mainDb) {
            this.mainDb = new MainDatabase(this);
        }
        return this.mainDb;
    }

    /**
     * initialize service
     */
    public async Initialize() {
        await this.Connection.Initialize();
        if (AppService.isWebApp) {
            await customElements.whenDefined('jeep-sqlite');
        }
        //Clean up database once a day
        interval(60 * 60 * 24 * 1000).subscribe(async () => {
            await this.Cleanup();
        });
        await this.Cleanup();
    }

    /**
     * cleans up the database(s)
     */
    public async Cleanup() {
        //WIP
        await this.MainDb.Cleanup();
    }
}

import { DatabaseService } from "../../database.service";
import { MainDatabaseCleaner } from "../cleaner/main-database-cleaner";
import { DatabaseTableBase } from "../tables/database-table-base";
import { ListitemsTable } from "../tables/listitems-table";
import { ListitemsTrashTable } from "../tables/listitems-trash-table";
import { ListsTable } from "../tables/lists-table";
import { ListsTrashTable } from "../tables/lists-trash-table";
import { DatabaseBase } from "./database-base";

export class MainDatabase extends DatabaseBase {
    public readonly Name: string = "main";

    /** database table for lists */
    public readonly Lists: ListsTable;
    /** database table for listitems */
    public readonly ListItems: ListitemsTable;
    /** database table for list in trash */
    public readonly ListsTrash: ListsTrashTable;

    /** database tabke for listitems in trash */
    public readonly ListitemsTrash: ListitemsTrashTable;

    constructor(service: DatabaseService) {
        super(service);
        this.ListItems = new ListitemsTable(this);
        this.Lists = new ListsTable(this);
        this.ListitemsTrash = new ListitemsTrashTable(this);
        this.ListsTrash = new ListsTrashTable(this);
    }

    /**
     * cleans up the database
     */
    public async Cleanup() {
        await (new MainDatabaseCleaner(this)).CleanUp();
    }

    /**
     * return all tables in the database
     * @returns array of all tables
     */
    public override GetAllTables(): DatabaseTableBase[] {
        return [this.Lists, this.ListItems, this.ListsTrash, this.ListitemsTrash];
    }
}

import { Logger } from "../../../logging/logger";
import { MainDatabase } from "../databases/main-database";

export class MainDatabaseCleaner {
    constructor(private readonly Database: MainDatabase) { }

    public async CleanUp() {
        const startdate = Date.now();

        //first, get all existing uuids from lists and trash
        let uuids: string[] | undefined = await this.Database.Lists.GetUuids();
        if (!uuids) {
            Logger.Error(`Could not fetch list-uuids for cleanup`);
            uuids = [];
        }
        const trash_uuids = await this.Database.ListsTrash.GetUuids();
        if (trash_uuids) {
            trash_uuids.forEach(uuid => {
                uuids.push(uuid);
            });
        }

        //if there are no lists, just delete all listitems
        if (uuids.length == 0) {
            if (await this.Database.ListItems.Truncate() && await this.Database.ListitemsTrash.Truncate()) {
                Logger.Debug(`Truncated tables ${this.Database.ListItems.BackendIdentifier} and ${this.Database.ListitemsTrash.BackendIdentifier}`);
            }
            return;
        }

        //clean up listitems table
        const deleted = await this.Database.ListItems.CleanupOrphanedItems(uuids);
        const deleted_trash = await this.Database.ListitemsTrash.CleanupOrphanedItems(uuids);
        const run = Date.now() - startdate;

        if (deleted > 0 && deleted_trash > 0) {
            Logger.Notice(`Database cleanup: Removed ${deleted} orphaned listitem(s) from ${this.Database.ListItems.BackendIdentifier} and ${deleted_trash} orphaned listitem(s) from ${this.Database.ListitemsTrash.BackendIdentifier} in ${run} ms`);
        }
        else if (deleted > 0) {
            Logger.Notice(`Database cleanup: Removed ${deleted} orphaned listitem(s) from ${this.Database.ListItems.BackendIdentifier} in ${run} ms`);
        }
        else if (deleted_trash > 0) {
            Logger.Notice(`Database cleanup: Removed ${deleted_trash} orphaned listitem(s) from ${this.Database.ListitemsTrash.BackendIdentifier} in ${run} ms`);
        }
        else {
            Logger.Debug(`Database cleanup: No orphaned listsitems found in database in ${run} ms`);
        }
    }
}

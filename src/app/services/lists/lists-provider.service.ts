import { Injectable, inject } from "@angular/core";
import { StringUtils } from "../../classes/utils/stringutils";
import { Logger } from "../logging/logger";
import { ListBackendService } from "../storage/list-backend/list-backend.service";
import { List } from "./list";

@Injectable({
    providedIn: "root",
})
export class ListsProviderService {
    protected StoragePath = "lists";
    protected readonly Backend = inject(ListBackendService);

    /**
     * read all lists from storage
     * @returns array of all lists
     */
    public async GetLists(): Promise<List[]> {
        return [];
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | undefined> {
        return undefined;
    }

    /**
     * stores a list in backend if there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean | undefined> {
        if (list.isPeek) {
            const old = await this.GetList(list.Uuid);
            list.copyDetails(old);
        }
        const json = list.toBackend(force);
        if (json) {
            const filename = this.createFilename(list);
            const uri = await this.Backend.Store({ filename: filename, subpath: this.StoragePath, data: JSON.stringify(json) });
            if (uri) {
                Logger.Debug(`Stored list ${list.toLog()} in backend '${uri}'`);
                await this.Backend.RemoveFiles(list.Uuid, this.StoragePath, [filename]);
                return true;
            } else {
                return false;
            }
        } else {
            return undefined;
        }
    }

    /**
     * removes a list from storage
     * @param list list to be removed
     * @returns was the removal successful
     */
    public async RemoveList(list: List): Promise<boolean> {
        return (await this.Backend.RemoveFiles(list.Uuid, this.StoragePath)) > 0;
    }

    /**
     * checks if a list with this Uuid exists
     * @param uuid Uuid to check
     * @returns does a list with this Uuid exist
     */
    public async Exists(uuid: string): Promise<boolean> {
        return this.Backend.FileExists(`^${uuid}-.*\\.json$`, this.StoragePath);
    }

    /**
     * create filename for a list to store in backend
     * @param list list to be stored
     * @returns filename for the list
     */
    private createFilename(list: List): string {
        return `${list.Uuid}-${StringUtils.FilesaveString(list.Name)}.json`;
    }
}

import { Injectable, inject } from "@angular/core";
import { FileUtils } from "../../classes/utils/fileutils";
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
        const allfiles = await this.Backend.GetAllFiles(this.StoragePath);
        let lists: List[] = [];
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            const content = await FileUtils.GetFile(file.uri);
            if (content?.Exists) {
                const list = List.fromBackend(JSON.parse(content.Content!));
                if (list) {
                    lists.push(list);
                }
            } else {
                await this.Backend.RemoveFilesByUri(file.uri);
                Logger.Error(`Removed invalid list-file '${file.uri}' (${FileUtils.File.FormatSize(file.size)}) from storage`);
            }
        }

        return lists;
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object, if it was found, otherwise undefined
     */
    public async GetList(uuid: string): Promise<List | undefined> {
        const file = await this.Backend.GetFile(ListsProviderService.createFilenamePattern(uuid));
        if (file?.Exists) {
            return List.fromBackend(JSON.parse(file!.Content!));
        }
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
            const filename = ListsProviderService.createFilename(list);
            const uri = await this.Backend.StoreFile({ filename: filename, subpath: this.StoragePath, data: JSON.stringify(json) });
            if (uri) {
                Logger.Debug(`Stored list ${list.toLog()} in backend '${uri}'`);
                await this.Backend.RemoveFilesbyUuid(list.Uuid, this.StoragePath, [filename]);
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
        return (await this.Backend.RemoveFilesbyUuid(list.Uuid, this.StoragePath)) > 0;
    }

    /**
     * checks if a list with this Uuid exists
     * @param uuid Uuid to check
     * @returns does a list with this Uuid exist
     */
    public async Exists(uuid: string): Promise<boolean> {
        return this.Backend.FileExists(ListsProviderService.createFilenamePattern(uuid), this.StoragePath);
    }

    /**
     * returns the number of lists
     * @returns number of lists
     */
    public async Count(): Promise<number> {
        return this.Backend.CountFiles(this.StoragePath);
    }

    /**
     * create filename for a list to store in backend
     * @param list list to be stored
     * @returns filename for the list
     */
    public static createFilename(list: List): string {
        return `${list.Uuid}-${StringUtils.shorten(StringUtils.FilesaveString(list.Name), 20)}.json`;
    }

    /**
     * creates a pattern to match the filename of a list by its uuid
     * @param uuid Uuid for the pattern
     * @returns filename pattern
     */
    public static createFilenamePattern(uuid: string) {
        return `^${uuid}-.*\\.json$`;
    }
}

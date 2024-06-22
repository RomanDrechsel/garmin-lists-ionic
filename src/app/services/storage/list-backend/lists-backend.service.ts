import { Injectable } from "@angular/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { FileUtils } from "../../../classes/utils/fileutils";
import { StringUtils } from "../../../classes/utils/stringutils";
import { ListModel } from "../../lists/list";
import { ListitemTrashModel } from "../../lists/listitems-trash-utils";
import { Logger } from "../../logging/logger";

@Injectable({
    providedIn: "root",
})
export class ListsBackendService {
    private readonly StorageDirectory: Directory = Directory.Data;
    private readonly StorageRoot: string = "lists";

    /**
     * returns all lists in the subfolder
     * @param backend backend identifier
     * @returns array of all lists in the backend
     */
    public async GetLists(backend?: string): Promise<ListModel[]> {
        const allfiles = await this.getAllFiles(backend, true);
        let lists: ListModel[] = [];
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file?.Exists && file.Content) {
                const model = JSON.parse(file.Content) as ListModel;
                if (model) {
                    lists.push(model);
                }
            } else {
                await this.removeFilesByUri(file.Path);
                Logger.Error(`Removed invalid list-file '${file.Path}' (${FileUtils.File.FormatSize(file.Size)}) from storage`);
            }
        }

        return lists;
    }

    /**
     * get a list from backend by its uuid
     * @param uuid Uuid of the list
     * @param backend backend identifier
     * @returns ListModel or undefined, if the list was not found
     */
    public async GetList(uuid: string, backend?: string): Promise<ListModel | undefined> {
        const file = await this.getFile(ListsBackendService.createFilenamePattern(uuid), backend);
        if (file?.Exists) {
            return JSON.parse(file.Content!) as ListModel;
        } else {
            return undefined;
        }
    }

    /**
     * returns the listitem from trash
     * @param uuid Uuid of the list
     * @param backend backend identifier
     * @returns ListitemTrashModel or undefined, if there is not trash for this list
     */
    public async GetListitemTrash(uuid: string, backend?: string): Promise<ListitemTrashModel | undefined> {
        const file = await this.getFile(ListsBackendService.createFilenamePattern(uuid), backend);
        if (file?.Exists) {
            return JSON.parse(file.Content!) as ListitemTrashModel;
        } else {
            return undefined;
        }
    }

    /**
     * returns all listitems in trash for all lists
     * @param backend backend identifier
     * @returns array of all listitem trashes
     */
    public async GetListitemsTrashes(backend?: string): Promise<ListitemTrashModel[]> {
        const allfiles = await this.getAllFiles(backend, true);
        let trashes: ListitemTrashModel[] = [];
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file?.Exists) {
                const model = JSON.parse(file.Content!) as ListitemTrashModel;
                if (model) {
                    trashes.push(model);
                }
            } else {
                await this.removeFilesByUri(file.Path);
                Logger.Error(`Removed invalid listitem-trash-file '${file.Path}' (${FileUtils.File.FormatSize(file.Size)}) from storage`);
            }
        }
        return trashes;
    }

    /**
     * store a list in a file in backend
     * @param args filename, path to the folder and data to write in the file
     * @param backend backend identifier to store the list in
     * @returns was the storage successful?
     */
    public async StoreList(list: ListModel, backend?: string): Promise<boolean> {
        const filename = ListsBackendService.createFilename(list);
        const path = backend ? StringUtils.concat([this.StorageRoot, backend], "/") : this.StorageRoot;
        const uri = StringUtils.concat([path, filename], "/");
        try {
            await Filesystem.writeFile({ path: uri, directory: this.StorageDirectory, data: JSON.stringify(list), encoding: Encoding.UTF8, recursive: true });
            return true;
        } catch (error) {
            Logger.Error(`Could not store file ${uri} in list-backend`, error);
        }
        return false;
    }

    /**
     * stores a listitem trash file in backend
     * @param list listitem trash model
     * @param backend backend identifier to store the listitem trash in
     * @returns was the storage successful?
     */
    public async StoreListitemTrash(list: ListitemTrashModel, backend?: string): Promise<boolean> {
        const filename = `${list.uuid}.json`;
        const path = backend ? StringUtils.concat([this.StorageRoot, backend], "/") : this.StorageRoot;
        const uri = StringUtils.concat([path, filename], "/");
        try {
            await Filesystem.writeFile({ path: uri, directory: this.StorageDirectory, data: JSON.stringify(list), encoding: Encoding.UTF8, recursive: true });
            return true;
        } catch (error) {
            Logger.Error(`Could not store file ${uri} in list-backend`, error);
        }
        return false;
    }

    /**
     * returns the number of files in the subfolder
     * @param backend subfolder, in which the files should be removed
     * @returns number of files
     */
    public async CountFiles(backend?: string): Promise<number> {
        const allfiles = await this.getAllFiles(backend);
        return allfiles.length;
    }

    /**
     * removes all list-files with the uuid in filename
     * @param uuids Unique identifier for which the files are to be removed
     * @param backend backend, in which the lists should be removed
     * @param exclude exact filenames (not paths!), not to remove
     * @returns number of files deleted
     */
    public async RemoveLists(uuids: string | string[], backend?: string): Promise<number> {
        if (!Array.isArray(uuids)) {
            uuids = [uuids];
        }

        const allfiles = await this.getAllFiles(backend, false);
        let del = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (uuids.some(uuid => file.Filename.startsWith(uuid))) {
                try {
                    await Filesystem.deleteFile({ path: file.Path });
                    Logger.Debug(`Removed file ${file.Path} (${FileUtils.File.FormatSize(file.Size)}) from lists backend`);
                    del++;
                } catch (error) {
                    Logger.Error(`Could not remove file ${file.Path} (${FileUtils.File.FormatSize(file.Size)}) from lists backend`);
                }
            }
        }
        return del;
    }

    /**
     * removes all listitems from list trashes
     * @param uuids uuid(s) of the lists
     * @param backend backend, in which the listitems should be removed
     * @returns was the removal of all listitems successful? undefined if there was nothing to remove
     */
    public async RemoveListitemsTrash(uuids: string | string[], backend?: string): Promise<boolean | undefined> {
        if (!Array.isArray(uuids)) {
            uuids = [uuids];
        }
        const allfiles = await this.getAllFiles(backend, false);
        let del = 0;
        let error = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (uuids.some(uuid => file.Filename.startsWith(uuid))) {
                if (await FileUtils.DeleteFile(file.Path)) {
                    Logger.Debug(`Removed file ${file.Path} (${FileUtils.File.FormatSize(file.Size)}) from lists backend`);
                    del++;
                } else {
                    Logger.Error(`Could not remove file ${file.Path} (${FileUtils.File.FormatSize(file.Size)}) from lists backend`);
                    error++;
                }
            }
        }
        if (error > 0) {
            return false;
        } else if (del > 0) {
            return true;
        } else {
            return undefined;
        }
    }

    /**
     * gets a single file by its name pattern
     * @param pattern pattern to match the name of the file
     * @param backend subfolder to search in
     * @returns FileUtils.File object if a file was found, else undefined
     */
    private async getFile(pattern: string, backend?: string): Promise<FileUtils.File | undefined> {
        const files = await this.getAllFiles(backend, false);
        const regex = new RegExp(pattern);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.Exists && regex.test(file.Filename)) {
                return await FileUtils.GetFile(file.Path);
            }
        }
        return undefined;
    }

    /**
     * removes one or more files from the backend
     * @param uri absolute uri(s) of the files to remove
     * @returns
     */
    private async removeFilesByUri(uri: string | string[]): Promise<number> {
        if (!Array.isArray(uri)) {
            uri = [uri];
        }
        let del = 0;
        for (let i = 0; i < uri.length; i++) {
            const file = uri[i];
            try {
                await Filesystem.deleteFile({ path: file });
                Logger.Debug(`Removed file ${file} from lists backend`);
                del++;
            } catch (error) {
                Logger.Error(`Could not remove file ${file} from lists backend:`, error);
            }
        }

        return del;
    }

    /**
     * returns all identifiers in the backend, that are older than a certain amount of seconds
     * @param seconds amount of seconds
     * @param backend
     * @returns
     */
    public async GetOldEntries(seconds: number, backend?: string): Promise<string[]> {
        const allfiles = await this.getAllFiles(backend);
        let uuids: string[] = [];
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file.Modified < Date.now() - seconds * 1000) {
                const uuid = ListsBackendService.getUuidFromFilename(file.Filename);
                if (uuid) {
                    uuids.push(uuid);
                }
            }
        }

        return uuids;
    }

    /**
     * removes all files from the folder, that are older than a certain amount of seconds
     * @param seconds minimum age of the files in seconds
     * @param backend backend identifier, in which the files should be removed
     * @returns number of deleted files
     */
    public async RemoveOldEntries(seconds: number, backend?: string): Promise<number> {
        const allfiles = await this.getAllFiles(backend);
        let deleted = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file.Modified < Date.now() - seconds * 1000) {
                if (await this.removeFileByUri(file.Path)) {
                    deleted++;
                    Logger.Debug(`Removed old file '${file.Path}' from lists backend`);
                }
            }
        }

        if (deleted > 0) {
            Logger.Debug(`Removed ${deleted} old file(s) from lists backend ${this.StorageDirectory}/${this.StorageRoot}/${backend ?? ""}`);
        }

        return deleted;
    }

    /**
     * only keep the number of newest files in backend
     * @param limit maximum number of files
     * @param backend backend identifier, in which the files should be removed
     * @returns number of deleted files
     */
    public async LimitEntriesCount(limit: number, backend?: string): Promise<number> {
        let allfiles = await this.getAllFiles(backend);
        let deleted = 0;
        if (allfiles.length > limit) {
            allfiles = allfiles.sort((a, b) => b.Modified - a.Modified);
            while (allfiles.length > limit) {
                const file = allfiles.pop();
                if (file) {
                    if (await this.removeFileByUri(file.Path)) {
                        deleted++;
                        Logger.Debug(`Removed old file '${file.Path}' from lists backend`);
                    }
                }
            }
        }

        if (deleted > 0) {
            Logger.Debug(`Removed ${deleted} old file(s) from list backend ${this.StorageDirectory}/${this.StorageRoot}/${backend ?? ""}`);
        }

        return deleted;
    }

    /**
     * checks if a list with a unique identifier
     * @param uuid Uuid of the list
     * @param backend backend identifier in which the files should be checked
     * @returns does a file with this pattern exist
     */
    public async ListExists(uuid: string, backend?: string): Promise<boolean> {
        const regex = new RegExp(ListsBackendService.createFilenamePattern(uuid));
        const allfiles = await this.getAllFiles(backend, false);
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (regex.test(file.Filename)) {
                return true;
            }
        }

        return false;
    }

    /**
     * lists all files in the folder
     * @param backend backend identifier to be listed
     * @returns list of all files in the folder
     */
    private async getAllFiles(backend?: string, with_data: boolean = false): Promise<FileUtils.File[]> {
        const fullpath = backend ? StringUtils.concat([this.StorageRoot, backend], "/") : this.StorageRoot;
        try {
            return await FileUtils.GetFiles({ path: fullpath, dir: this.StorageDirectory, with_data: with_data });
        } catch (error) {
            Logger.Error(`Could not read list index for backend ${this.StorageDirectory}/${fullpath}`);
            return [];
        }
    }

    /**
     * deletes a file from storage
     * @param fileuri uri of the file
     * @returns was the removal successfull?
     */
    private async removeFileByUri(fileuri: string): Promise<boolean> {
        try {
            await Filesystem.deleteFile({ path: fileuri });
            return true;
        } catch (error) {
            Logger.Error(`Could not remove old file ${fileuri} from lists backend: `, error);
        }
        return false;
    }

    /**
     * create filename for a list to store in backend
     * @param list list to be stored
     * @returns filename for the list
     */
    public static createFilename(list: ListModel): string {
        return `${list.uuid}-${StringUtils.shorten(StringUtils.FilesaveString(list.name), 20)}.json`;
    }

    /**
     * creates a pattern to match the filename of a list by its uuid
     * @param uuid Uuid for the pattern
     * @returns filename pattern
     */
    public static createFilenamePattern(uuid: string) {
        return `^${uuid}-.*\\.json$`;
    }

    /**
     * gets the uuid from a filename
     * @param filename name of the file
     * @returns the uuid or undefined, if the pattern not matches
     */
    private static getUuidFromFilename(filename: string): string | undefined {
        const regex = new RegExp("[^-]*)-.*.json$");
        const match = filename.match(regex);
        return match ? match[1] : undefined;
    }
}

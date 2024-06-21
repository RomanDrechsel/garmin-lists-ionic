import { Injectable } from "@angular/core";
import { Directory, Encoding, FileInfo, Filesystem } from "@capacitor/filesystem";
import { FileUtils } from "../../../classes/utils/fileutils";
import { StringUtils } from "../../../classes/utils/stringutils";
import { Logger } from "../../logging/logger";

@Injectable({
    providedIn: "root",
})
export class ListBackendService {
    private readonly StorageDirectory: Directory = Directory.Data;
    private readonly StorageRoot: string = "lists";

    /**
     * gets a single file by its name pattern
     * @param pattern pattern to test the name of the file
     * @param subpath subfolder to search in
     * @returns FileUtils.File object if a file was found, else undefined
     */
    public async GetFile(pattern: string, subpath?: string): Promise<FileUtils.File | undefined> {
        const files = await this.GetAllFiles(subpath);
        const regex = new RegExp(pattern);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (regex.test(file.name)) {
                return await FileUtils.GetFile(file.uri);
            }
        }
        return undefined;
    }

    /**
     * store a list in a file in backend
     * @param args filename, path to the folder and data to write in the file
     * @returns uri of the new created file
     */
    public async StoreFile(args: { filename: string; subpath?: string; data: string }): Promise<string | false> {
        const uri = args.subpath ? StringUtils.concat([this.StorageRoot, args.subpath, args.filename], "/") : this.StorageRoot;
        try {
            return (await Filesystem.writeFile({ path: uri, directory: this.StorageDirectory, data: args.data, encoding: Encoding.UTF8, recursive: true })).uri;
        } catch (error) {
            Logger.Error(`Could not store file ${uri} in list-backend`, error);
        }
        return false;
    }

    /**
     * returns the number of files in the subfolder
     * @param subpath subfolder, in which the files should be removed
     * @returns number of files
     */
    public async CountFiles(subpath?: string): Promise<number> {
        const allfiles = await this.GetAllFiles(subpath);
        return allfiles.length;
    }

    /**
     * removes all list-files with the uuid in filename
     * @param uuids Unique identifier for which the files are to be removed
     * @param subpath subfolder, in which the files should be removed
     * @param exclude exact filenames (not paths!), not to remove
     * @returns number of files deleted
     */
    public async RemoveFilesbyUuid(uuids: string | string[], subpath?: string, exclude: string[] | undefined = []): Promise<number> {
        if (!exclude) {
            exclude = [];
        }

        if (!Array.isArray(uuids)) {
            uuids = [uuids];
        }

        const allfiles = await this.GetAllFiles(subpath);
        let del = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (uuids.some(uuid => file.name.startsWith(uuid)) && !exclude.includes(file.name)) {
                try {
                    await Filesystem.deleteFile({ path: file.uri });
                    Logger.Debug(`Removed file ${file.uri} (${FileUtils.File.FormatSize(file.size)}) from lists backend`);
                    del++;
                } catch (error) {
                    Logger.Error(`Could not remove file ${file.uri} (${FileUtils.File.FormatSize(file.size)}) from lists backend`);
                }
            }
        }
        return del;
    }

    /**
     * removes one or more files from the backend
     * @param uri full uri(s) of the files to remove
     * @returns
     */
    public async RemoveFilesByUri(uri: string | string[]): Promise<number> {
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
     * removes all files from the folder, that are older than a certain amount of seconds
     * @param seconds minimum age of the files in seconds
     * @param subpath subfolder, in which the files should be removed
     * @returns number of deleted files
     */
    public async RemoveOldFiles(seconds: number, subpath?: string): Promise<number> {
        const allfiles = await this.GetAllFiles(subpath);
        let deleted = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file.mtime < Date.now() - seconds * 1000) {
                if (await this.removeFile(file.uri)) {
                    deleted++;
                    Logger.Debug(`Removed old file '${file.uri}' from lists backend`);
                }
            }
        }

        if (deleted > 0) {
            Logger.Debug(`Removed ${deleted} old file(s) from lists backend ${this.StorageDirectory}/${this.StorageRoot}/${subpath ?? ""}`);
        }

        return deleted;
    }

    /**
     * only keep the number of newest files in backend
     * @param limit maximum number of files
     * @param subpath subfolder, in which the files should be removed
     * @returns number of deleted files
     */
    public async LimitFileCount(limit: number, subpath?: string): Promise<number> {
        let allfiles = await this.GetAllFiles(subpath);
        let deleted = 0;
        if (allfiles.length > limit) {
            allfiles = allfiles.sort((a, b) => a.mtime - b.mtime);
            while (allfiles.length > limit) {
                const file = allfiles.shift();
                if (file) {
                    if (await this.removeFile(file.uri)) {
                        deleted++;
                        Logger.Debug(`Removed old file '${file.uri}' from lists backend`);
                    }
                }
            }
        }

        if (deleted > 0) {
            Logger.Debug(`Removed ${deleted} old file(s) from list backend ${this.StorageDirectory}/${this.StorageRoot}/${subpath ?? ""}`);
        }

        return deleted;
    }

    /**
     * checks if a file with this name pattern exists
     * @param pattern name pattern
     * @param subpath subfolder in which the files should be checked
     * @returns does a file with this pattern exist
     */
    public async FileExists(pattern: string, subpath: string): Promise<boolean> {
        const allfiles = await this.GetAllFiles(subpath);
        const regex = new RegExp(pattern);
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (regex.test(file.name)) {
                return true;
            }
        }

        return false;
    }

    /**
     * lists all files in the folder
     * @param subpath subfolder to be listed
     * @returns list of all files in the folder
     */
    public async GetAllFiles(subpath?: string): Promise<FileInfo[]> {
        const fullpath = subpath ? StringUtils.concat([this.StorageRoot, subpath], "/") : this.StorageRoot;
        try {
            let allfiles = (await Filesystem.readdir({ path: fullpath, directory: this.StorageDirectory })).files;
            allfiles = allfiles.filter(file => file.type === "file");
            return allfiles;
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
    private async removeFile(fileuri: string): Promise<boolean> {
        try {
            await Filesystem.deleteFile({ path: fileuri });
            return true;
        } catch (error) {
            Logger.Error(`Could not remove old file ${fileuri} from lists backend: `, error);
        }
        return false;
    }
}

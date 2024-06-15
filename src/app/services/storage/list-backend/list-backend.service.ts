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
     * store a list in a file in backend
     * @param args filename, path to the folder and data to write in the file
     * @returns uri of the new created file
     */
    public async Store(args: { filename: string; subpath: string; data: string }): Promise<string | false> {
        const uri = StringUtils.concat([this.StorageRoot, args.subpath, args.filename], "/");
        try {
            return (await Filesystem.writeFile({ path: uri, directory: this.StorageDirectory, data: args.data, encoding: Encoding.UTF8, recursive: true })).uri;
        } catch (error) {
            Logger.Error(`Could not store file ${uri} in list-backend`, error);
        }
        return false;
    }

    /**
     * removes all list-files with the uuid in filename
     * @param uuid Unique identifier for which the files are to be removed
     * @param subpath folder, in which the files should be removed
     * @param exclude exact filenames (not paths!), not to remove
     * @returns number of files deleted
     */
    public async RemoveFiles(uuid: string, subpath?: string, exclude: string[] | undefined = []): Promise<number> {
        if (!exclude) {
            exclude = [];
        }
        const allfiles = await this.getAllFiles(subpath);
        let del = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file.name.startsWith(uuid) && !exclude.includes(file.name)) {
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
     * removes all files from the folder, that are older than a certain amount of seconds
     * @param seconds minimum age of the files in seconds
     * @param subpath folder, in which the files should be removed
     */
    public async RemoveOldFiles(seconds: number, subpath?: string): Promise<number> {
        const allfiles = await this.getAllFiles(subpath);
        let deleted = 0;
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (file.mtime < Date.now() - seconds) {
                try {
                    await Filesystem.deleteFile({ path: file.uri });
                    deleted++;
                    Logger.Debug(`Removed old file '${file.uri}' from lists backend`);
                } catch (error) {
                    Logger.Error(`Could not remove old file ${file.uri} from lists backend: `, error);
                }
            }
        }

        return deleted;
    }

    /**
     * only keep the number of newest files in backend
     * @param limit maximum number of files
     */
    public async LimitFiles(limit: number, subpath?: string): Promise<number> {
        const allfiles = await this.getAllFiles(subpath);
    }

    /**
     * checks if a file with this name pattern exists
     * @param pattern name pattern
     * @param subpath subfolder in which the files should be checked
     * @returns does a file with this pattern exist
     */
    public async FileExists(pattern: string, subpath: string): Promise<boolean> {
        const allfiles = await this.getAllFiles(subpath);
        const regex = new RegExp(pattern);
        for (let i = 0; i < allfiles.length; i++) {
            const file = allfiles[i];
            if (regex.test(file.name)) {
                return true;
            }
        }

        return false;
    }

    private async getAllFiles(subpath?: string): Promise<FileInfo[]> {
        const fullpath = subpath ? StringUtils.concat([this.StorageRoot, subpath], "/") : this.StorageRoot;
        try {
            return (await Filesystem.readdir({ path: fullpath, directory: this.StorageDirectory })).files;
        } catch (error) {
            Logger.Error(`Could not read list index for backend ${this.StorageDirectory}/${fullpath}`);
            return [];
        }
    }
}

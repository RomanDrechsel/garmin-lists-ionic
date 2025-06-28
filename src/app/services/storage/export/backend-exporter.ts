import { Directory, Filesystem, type ReaddirResult } from "@capacitor/filesystem";
import { Zip } from "capa-zip";
import { StringUtils } from "src/app/classes/utils/string-utils";
import { ListsProvider } from "../../lists/lists-provider";
import { Logger } from "../../logging/logger";
import { ListsBackendService } from "./../lists/lists-backend.service";

export class BackendExporter {
    private _isRunning = false;
    private _tmpPath = "export";
    private _tmpDir = Directory.Cache;

    public get Running(): boolean {
        return this._isRunning;
    }

    constructor() {}

    public async Initialize(): Promise<boolean> {
        //remove old export files if any exist
        if (!(await this.removeOldFiles())) {
            return false;
        }
        this._isRunning = true;
        return true;
    }

    public async Stop() {
        //await this.removeOldFiles();
        this._isRunning = false;
    }

    public async Finalize(): Promise<string | boolean> {
        if (this._isRunning) {
            let source,
                destination = "";
            try {
                const source = (await Filesystem.getUri({ path: this._tmpPath, directory: this._tmpDir })).uri;
                const destination = (await Filesystem.getUri({ path: "lists-export.zip", directory: Directory.Documents })).uri;
                await Zip.zip({
                    sourcePath: source,
                    destinationPath: destination,
                });
                Logger.Notice(`Export: created archive at ${destination}`);
            } catch (e) {
                Logger.Error(`Export: could not export '${source}' to '${destination}': `, e);
                return false;
            }
        }

        await this.Stop();
        return true;
    }

    public async ExportLists(): Promise<boolean> {
        const fullpath = StringUtils.concat([ListsBackendService.StorageRoot, ListsProvider.StoragePath], "/");
        let files: ReaddirResult;
        try {
            files = await Filesystem.readdir({ path: fullpath, directory: ListsBackendService.StorageDirectory });
        } catch (e) {
            Logger.Error(`Export failed: could not read lists directory at '${fullpath}' in '${ListsBackendService.StorageDirectory}': `, e);
            return false;
        }

        if (files?.files.length > 0) {
            const target = this._tmpPath + "/lists/lists";
            if (!(await this.createTempDirectory(target))) {
                return false;
            }

            for (let i = 0; i < files.files.length; i++) {
                const file = files.files[i];
                try {
                    const uri = (await Filesystem.copy({ from: file.uri, to: StringUtils.concat([target, file.name], "/"), toDirectory: this._tmpDir })).uri;
                    Logger.Debug(`Export: copied list to '${uri}'`);
                } catch (e) {
                    Logger.Error(`Export failed: could not copy file '${files.files[i].name}' to temp directory '${target}': `, e);
                }
            }
        }

        return true;
    }

    private async createTempDirectory(fullpath: string): Promise<boolean> {
        /*const paths = fullpath.split("/");
        let path = "";
        try {
            for (let i = 0; i < paths.length; i++) {
                if (path.length > 0) {
                    path += "/" + paths[i];
                } else {
                    path = paths[i];
                }
                await Filesystem.mkdir({ path: path, directory: this._tmpDir, recursive: true });
                console.log(path, await Filesystem.getUri({ path: path, directory: this._tmpDir }));
            }
        } catch (e) {
            Logger.Error(`Export failed: could not create temporary directory at '${path}' in '${this._tmpDir}': `, e);
            return false;
        }*/
        try {
            await Filesystem.mkdir({ path: fullpath, directory: this._tmpDir, recursive: true });
        } catch (e) {
            Logger.Error(`Export failed: could not create temporary directory at '${fullpath}' in '${this._tmpDir}': `, e);
            return false;
        }

        return true;
    }

    private async removeOldFiles(): Promise<boolean> {
        try {
            await Filesystem.stat({ path: this._tmpPath, directory: this._tmpDir });
        } catch {
            //direcory does not exist
            return true;
        }

        try {
            await Filesystem.rmdir({ path: this._tmpPath, directory: this._tmpDir, recursive: true });
        } catch (e) {
            Logger.Error(`Export failed: could not remove old export files from '${(await Filesystem.getUri({ path: this._tmpPath, directory: this._tmpDir })).uri}':`, e);
            return false;
        }

        return true;
    }
}

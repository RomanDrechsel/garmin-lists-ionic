import { Directory, Encoding, Filesystem, type ReaddirResult } from "@capacitor/filesystem";
import { Zip } from "capa-zip";
import { StringUtils } from "src/app/classes/utils/string-utils";
import { ListitemsTrashProvider } from "../../lists/listitems-trash-provider";
import { ListsProvider } from "../../lists/lists-provider";
import { TrashProvider } from "../../lists/trash-provider";
import { Logger } from "../../logging/logger";
import { type PreferencesService } from "../preferences.service";
import { ListsBackendService } from "./../lists/lists-backend.service";

export class BackendExporter {
    private _isRunning = false;
    private _exportPath = "export";
    private _exportDir = Directory.Cache;
    private _archiveName = "lists-export.zip";
    private _settingsFile = "settings.json";

    private get _tmpPath(): string {
        return StringUtils.concat([this._exportPath, "temp"], "/");
    }

    private get _exportArchive(): string {
        return StringUtils.concat([this._exportPath, this._archiveName], "/");
    }

    public get Running(): boolean {
        return this._isRunning;
    }

    public async Initialize(): Promise<boolean> {
        //remove old export files if any exist
        if (!(await this.removeOldFiles())) {
            return false;
        }
        this._isRunning = true;
        return true;
    }

    public async Stop() {
        await this.removeOldFiles();
        this._isRunning = false;
    }

    public async Finalize(): Promise<false | string> {
        if (this._isRunning) {
            let source,
                destination = "";
            try {
                source = (await Filesystem.getUri({ path: this._tmpPath, directory: this._exportDir })).uri;
                destination = (await Filesystem.getUri({ path: this._exportArchive, directory: this._exportDir })).uri;
                await Zip.zip({
                    sourcePath: source,
                    destinationPath: destination,
                });
                Logger.Notice(`Export: created archive at ${destination}`);
            } catch (e) {
                Logger.Error(`Export: could not export '${source}' to '${destination}': `, e);
                await this.Stop();
                return false;
            }

            await this.Stop();

            try {
                await Filesystem.copy({ from: destination, to: this._archiveName, toDirectory: Directory.Documents });
            } catch (e) {
                Logger.Error(`Export: could not copy archive '${destination}' to '${this._archiveName}' in DOCUMENTS`, e);
                return false;
            }

            await this.Stop();

            return destination;
        }
        return false;
    }

    public async ExportLists(listener?: ProgressListener): Promise<boolean> {
        const fullpath = StringUtils.concat(ListsBackendService.StorageRoot, ListsProvider.StoragePath, "/");

        let total_files = 0;
        if (listener) {
            total_files = await this.stats(fullpath);
            listener.Init(total_files);
        }

        return this.copyFiles({ fullpath: fullpath, recursive: false, listener: listener, total_files: total_files });
    }

    public async ExportTrash(listener?: ProgressListener): Promise<boolean> {
        const fullpath = StringUtils.concat(ListsBackendService.StorageRoot, TrashProvider.StoragePath, "/");
        let total_files = 0;
        if (listener) {
            total_files = await this.stats(fullpath);
            if (!ListitemsTrashProvider.StoragePath.startsWith(TrashProvider.StoragePath)) {
                total_files += await this.stats(StringUtils.concat([ListsBackendService.StorageRoot, ListitemsTrashProvider.StoragePath], "/"));
            }
            listener.Init(total_files);
        }

        const done = await this.copyFiles({ fullpath: fullpath, recursive: true, listener: listener, total_files: total_files });
        if (done) {
            if (!ListitemsTrashProvider.StoragePath.startsWith(TrashProvider.StoragePath)) {
                const items_fullpath = StringUtils.concat([ListsBackendService.StorageRoot, ListitemsTrashProvider.StoragePath], "/");
                return this.copyFiles({ fullpath: items_fullpath, recursive: false, listener: listener, total_files: total_files });
            }
        }
        return done;
    }

    public async ExportSettings(service: PreferencesService): Promise<boolean> {
        const filename = StringUtils.concat(this._tmpPath, this._settingsFile, "/");
        const json = await service.Export();
        try {
            const write = await Filesystem.writeFile({ path: filename, directory: this._exportDir, data: json, encoding: Encoding.UTF8 });
            Logger.Debug(`Export: saved app settings to '${write.uri}'`);
        } catch (e) {
            Logger.Error(`Export failed: could not write settings file to '${filename}' in '${this._exportDir}': `, e);
            return false;
        }

        return true;
    }

    public async ClearUp() {
        await this.removeOldFiles();
        try {
            await Filesystem.deleteFile({ path: this._exportArchive, directory: this._exportDir });
        } catch (e) {
            console.log(e);
        }

        try {
            await Filesystem.rmdir({ path: this._exportPath, directory: this._exportDir, recursive: true });
        } catch (e) {
            console.log(e);
        }
    }

    private async createTempDirectory(fullpath: string): Promise<boolean> {
        fullpath = StringUtils.concat(this._tmpPath, fullpath, "/");
        try {
            await Filesystem.mkdir({ path: fullpath, directory: this._exportDir, recursive: true });
        } catch (e) {
            Logger.Error(`Export failed: could not create temporary directory at '${fullpath}' in '${this._exportDir}': `, e);
            return false;
        }

        return true;
    }

    private async copyFiles(args: { fullpath: string; recursive: boolean; listener?: ProgressListener; total_files?: number }): Promise<boolean> {
        try {
            await Filesystem.stat({ path: args.fullpath, directory: ListsBackendService.StorageDirectory });
        } catch {
            //no list directory exists
            return true;
        }

        let files: ReaddirResult;
        try {
            files = await Filesystem.readdir({ path: args.fullpath, directory: ListsBackendService.StorageDirectory });
        } catch (e) {
            Logger.Error(`Export failed: could not read directory at '${args.fullpath}' in '${ListsBackendService.StorageDirectory}': `, e);
            return false;
        }

        if (files?.files.length > 0) {
            const target = StringUtils.concat([this._tmpPath, args.fullpath], "/");

            if (!(await this.createTempDirectory(args.fullpath))) {
                return false;
            }

            for (let i = 0; i < files.files.length; i++) {
                const file = files.files[i];
                if (args.recursive && file.type == "directory") {
                    await this.copyFiles({ fullpath: StringUtils.concat(args.fullpath, file.name, "/"), recursive: args.recursive, listener: args.listener, total_files: args.total_files });
                } else if (file.type != "file" || !file.name.endsWith(".json")) {
                    Logger.Debug(`Export ignoring non-json file: ${file.uri}`);
                    args.listener?.oneDone();
                    continue;
                } else {
                    try {
                        const uri = (await Filesystem.copy({ from: file.uri, to: StringUtils.concat([target, file.name], "/"), toDirectory: this._exportDir })).uri;
                        Logger.Debug(`Export: copied '${file.uri}' file to '${uri}'`);
                    } catch (e) {
                        Logger.Error(`Export failed: could not copy file '${file.uri}' to temp directory '${target}': `, e);
                    }
                }
                args.listener?.oneDone();
            }
        }

        return true;
    }

    private async removeOldFiles(fullpath?: string): Promise<boolean> {
        let directory;
        try {
            directory = await Filesystem.stat({ path: this._tmpPath, directory: this._exportDir });
        } catch {
            //direcory does not exist
            return true;
        }

        const exportPath = fullpath?.length ? StringUtils.concat(this._tmpPath, fullpath, "/") : this._tmpPath;
        try {
            if (directory.type == "directory") {
                const files = (await Filesystem.readdir({ path: exportPath, directory: this._exportDir })).files;
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type == "file") {
                        const path = StringUtils.concat(exportPath, file.name, "/");
                        await Filesystem.deleteFile({ path: path, directory: this._exportDir });
                    } else {
                        const path = fullpath?.length ? StringUtils.concat(fullpath, file.name, "/") : file.name;
                        await this.removeOldFiles(path);
                    }
                }
                await Filesystem.rmdir({ path: exportPath, directory: this._exportDir, recursive: true });
            } else {
                await Filesystem.deleteFile({ path: exportPath, directory: this._exportDir });
            }
        } catch (e) {
            Logger.Error(`Export failed: could not remove old export files from '${(await Filesystem.getUri({ path: exportPath, directory: this._exportDir })).uri}':`, e);
            return false;
        }

        return true;
    }

    private async stats(fullpath: string): Promise<number> {
        let count = 0;
        try {
            const stat = await Filesystem.stat({ path: fullpath, directory: ListsBackendService.StorageDirectory });
            if (stat.type == "file") {
                return 1;
            } else {
                const files = await Filesystem.readdir({ path: fullpath, directory: ListsBackendService.StorageDirectory });
                for (let i = 0; i < files.files.length; i++) {
                    const file = files.files[i];
                    if (file.type == "file") {
                        count++;
                    } else {
                        count += (await this.stats(StringUtils.concat(fullpath, file.name, "/"))) + 1;
                    }
                }
            }
        } catch (e) {
            Logger.Error(`Export failed: could not get file count for '${(await Filesystem.getUri({ path: fullpath, directory: ListsBackendService.StorageDirectory })).uri}':`, e);
            return -1;
        }

        return count;
    }
}
export class ProgressListener {
    protected _total: number = -1;
    protected _done: number = 0;

    public Init(total: number) {
        this._done = 0;
        this._total = total;
    }

    public oneDone() {
        this._done++;
        if (this._total > 0) {
            this.onProgress(this._done / this._total);
        }
        console.log(this);
    }

    protected onProgress(done: number): Promise<void> {
        return Promise.resolve();
    }
}

export function ProgressListenerFactory(onProgressCallback: (progress: number) => void | Promise<void>): ProgressListener {
    return new (class extends ProgressListener {
        protected override async onProgress(done: number): Promise<void> {
            await onProgressCallback(done);
        }
    })();
}

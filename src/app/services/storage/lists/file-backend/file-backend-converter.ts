import { Directory, type FileInfo, Filesystem } from "@capacitor/filesystem";
import { ModalController } from "@ionic/angular/standalone";
import { FileUtils } from "src/app/classes/utils/file-utils";
import { LegacyBackendImportComponent } from "src/app/components/legacy-backend-import/legacy-backend-import.component";
import { Logger } from "../../../logging/logger";
import type { MainSqliteBackendService } from "../main-sqlite-backend.service";
import type { FileBackendListModel } from "./file-backend-list-model";
import { FileBackendSqliteBackend } from "./file-backend-sqlite-backend";

export class FileBackendConverter {
    private readonly StorageDirectory: Directory = Directory.Data;
    private readonly StorageRoot: string = "lists";

    private _modalComponent?: LegacyBackendImportComponent;

    private _backend?: FileBackendSqliteBackend;

    constructor(private _sqliteService: MainSqliteBackendService, private _modalCtrl: ModalController) {}

    /**
     * check if a legacy backend exists in storage and try to transfer it into the new sqlite backend
     */
    public async CheckLegacyBackend(): Promise<void> {
        let directories: FileInfo[] = [];
        try {
            directories = (await Filesystem.readdir({ path: this.StorageRoot, directory: this.StorageDirectory })).files;
        } catch {
            Logger.Debug("No legacy backend found.");
            return;
        }

        Logger.Important(`Found legacy backend with ${directories.length} directories`);
        const modal = await this._modalCtrl.create({
            component: LegacyBackendImportComponent,
            componentProps: {
                onReady: (instance: LegacyBackendImportComponent) => {
                    this._modalComponent = instance;
                },
            },
            focusTrap: true,
            canDismiss: false,
            keyboardClose: false,
        });
        modal.present();

        const filesCount = await this.calcFiles(directories);
        if (filesCount == 0) {
            Logger.Important(`Found no files in legacy backend`);
            modal.dismiss();
            await this.cleanUpLegacyBackend();
            return;
        }

        Logger.Important(`Found ${filesCount} files in legacy backend`);
        this.updateModal(0, filesCount);

        this._backend = new FileBackendSqliteBackend(this._sqliteService);

        const listsdir = directories.find(d => d.name === "lists" && d.type === "directory");
        if (listsdir) {
            await this.readLists(listsdir);
        }
    }

    /**
     * read all list files from legacy backend and transfer them into sqlite backend
     * @param directory directory to scan
     */
    private async readLists(directory: FileInfo): Promise<void> {
        const files = await Filesystem.readdir({ path: directory.uri });
        Logger.Debug(`Found ${files.files.length} lists in legacy backend`);
        for (let i = 0; i < files.files.length; i++) {
            const file = files.files[i];
            if (file.type === "directory") {
                Logger.Debug(`Skipping directory ${file.uri}`);
                continue;
            } else if (!file.name.endsWith(".json")) {
                Logger.Debug(`Skipping non-json file ${file.uri}`);
                continue;
            }

            const model = await this.getFileContent<FileBackendListModel>(file);
            if (model) {
                await this.storeList(model); //WIP:
            }
        }
    }

    /**
     * calculates the total number of files in the legacy backend directories
     * @param directories legacy backend directories
     * @returns total number of files
     */
    private async calcFiles(directories: FileInfo[]): Promise<number> {
        let count = 0;

        for (let i = 0; i < directories.length; i++) {
            const directory = directories[i];
            if (directory.type === "directory") {
                if (["lists", "trash"].indexOf(directory.name) >= 0) {
                    count += await this.recursiveFilesCount(directory.uri);
                }
            }
        }

        Logger.Debug(`Found ${count} files in legacy backend.`);

        return count;
    }

    /**
     * recursivly counts the number of files in a directory and its subdirectories.
     * @param directory directory to count files in.
     * @returns number of files
     */
    private async recursiveFilesCount(directory: string): Promise<number> {
        let count = 0;
        let unknown = 0;

        try {
            const files = (await Filesystem.readdir({ path: directory })).files;

            for (let i = 0; i < files.length; i++) {
                if (files[i].type === "file") {
                    if (files[i].name.endsWith(".json")) {
                        count++;
                    } else {
                        unknown++;
                    }
                } else {
                    count += await this.recursiveFilesCount(files[i].uri);
                }
            }
        } catch (e) {
            Logger.Error(`Could not read recursivly from directory ${directory}: `, e);
        }

        if (unknown > 0) {
            Logger.Error(`Found ${unknown} unknown files in legacy backend.`);
        }

        return count;
    }

    /**
     * update the progress bar in the modal component
     * @param done legacy items done
     * @param total total number of legacy items
     */
    private async updateModal(done?: number, total: number | undefined = undefined) {
        if (this._modalComponent) {
            if (done) {
                this._modalComponent.ItemDone = done;
            }
            if (total) {
                this._modalComponent.ItemCount = total;
            }
        }
    }

    /**
     * reads the content of a file as string
     * @param fileinfo file to read
     * @returns content as string
     */
    private async getFileContent<T>(fileinfo: FileInfo): Promise<T | undefined> {
        const file = new FileUtils.File(fileinfo.uri, fileinfo.size, fileinfo.ctime, fileinfo.mtime);
        await file.ReadContent();
        if (file.Content) {
            try {
                return JSON.parse(file.Content) as T;
            } catch (e) {
                Logger.Error(`Error parsing JSON content of file ${fileinfo.uri}:`, e);
            }
        } else {
            Logger.Error(`Could not read content of file ${fileinfo.uri}`);
        }
        return undefined;
    }

    /**
     * remove the legacy backend in total
     */
    private async cleanUpLegacyBackend() {
        Logger.Important("Cleaning up legacy backend.");
        //TODO: delete files...
    }
}

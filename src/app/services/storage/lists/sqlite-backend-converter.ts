import { Directory, type FileInfo, Filesystem } from "@capacitor/filesystem";
import { ModalController } from "@ionic/angular/standalone";
import { LegacyBackendImportComponent } from "src/app/components/legacy-backend-import/legacy-backend-import.component";
import { Logger } from "../../logging/logger";
import type { MainSqliteBackendService } from "./main-sqlite-backend.service";

export class SqliteBackendConverter {
    private readonly StorageDirectory: Directory = Directory.Data;
    private readonly StorageRoot: string = "lists";

    constructor(private _service: MainSqliteBackendService, private _modalCtrl: ModalController) {}

    public async CheckLegacyBackend(): Promise<void> {
        let directories: FileInfo[] = [];
        try {
            directories = (await Filesystem.readdir({ path: this.StorageRoot, directory: this.StorageDirectory })).files;
        } catch {
            Logger.Debug("No legacy backend found.");
            return;
        }

        Logger.Important(`Found legacy backend with ${directories.length} directories`);
        const modal = await this._modalCtrl.create({ component: LegacyBackendImportComponent });
        modal.present();
    }
}

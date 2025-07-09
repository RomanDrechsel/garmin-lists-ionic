import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CapacitorException } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { IonButton, IonButtons, IonCard, IonContent, IonIcon, IonImg, IonItem, IonLabel, IonList, IonProgressBar, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonText, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { IntentSender } from "capacitor-intent-sender";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";
import SysInfo from "src/app/plugins/sysinfo/sys-info";
import { Logger } from "src/app/services/logging/logger";
import { BackendExporter, ProgressListenerFactory } from "src/app/services/storage/export/backend-exporter";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-export",
    templateUrl: "./export.page.html",
    styleUrls: ["./export.page.scss"],
    standalone: true,
    imports: [IonImg, IonButtons, IonText, IonItem, IonLabel, IonList, IonCard, IonToggle, IonButton, IonContent, IonIcon, IonSegment, IonToggle, IonSegmentButton, IonSegmentView, IonSegmentContent, IonProgressBar, CommonModule, FormsModule, TranslateModule, MainToolbarComponent],
})
export class ExportPage extends PageBase {
    @ViewChild("segbtnLists", { static: false, read: ElementRef }) private _segbtnLists?: ElementRef;
    @ViewChild("segbtnTrash", { static: false, read: ElementRef }) private _segbtnTrash?: ElementRef;
    @ViewChild("segbtnSettings", { static: false, read: ElementRef }) private _segbtnSettings?: ElementRef;
    @ViewChild("segbtnFinish", { static: false, read: ElementRef }) private _segbtnFinish?: ElementRef;

    private _exportItems: Map<string, ExportItem>;
    private _exporter?: BackendExporter;
    private _exportArchive?: string;
    private _listagoInstalled: boolean = false;

    public get ExportLists(): boolean {
        return this._exportItems.get("lists")?.status !== "disabled";
    }

    public get ExportTrash(): boolean {
        return this._exportItems.get("trash")?.status !== "disabled";
    }

    public get ExportSettings(): boolean {
        return this._exportItems.get("settings")?.status !== "disabled";
    }

    public get SomethingEnabled(): boolean {
        return Array.from(this._exportItems.values()).some(item => item.status !== "disabled");
    }

    public get ExportRunning(): boolean {
        return this._exporter?.Running ?? false;
    }

    public get ExportItems(): ExportItem[] {
        return Array.from(this._exportItems.values()).sort((a, b) => a.order - b.order);
    }

    public get ExportDone(): boolean {
        return this._exportArchive !== undefined;
    }

    public get ListagoInstalled(): boolean {
        return this._listagoInstalled;
    }

    constructor() {
        super();
        this._exportItems = new Map<string, ExportItem>([
            ["lists", { locale: "page_settings_export.export_summary_lists", status: "enabled", done: 0, order: 0 }],
            ["trash", { locale: "page_settings_export.export_summary_trash", status: "enabled", done: 0, order: 1 }],
            ["settings", { locale: "page_settings_export.export_summary_settings", status: "enabled", done: 0, order: 2 }],
        ]);
    }

    public override async ionViewWillEnter(): Promise<void> {
        this._listagoInstalled = (await SysInfo.AppInstalled({ packageName: this.Config.ListagoApp })).installed;
    }

    public toLists() {
        this._segbtnLists?.nativeElement?.click();
    }

    public toTrash() {
        this._segbtnTrash?.nativeElement?.click();
    }

    public toSettings() {
        this._segbtnSettings?.nativeElement?.click();
    }

    public toFinish() {
        this._segbtnFinish?.nativeElement?.click();
    }

    public toggleLists(checked: boolean) {
        const item = this._exportItems.get("lists");
        if (item) {
            item.status = checked ? "enabled" : "disabled";
        }
    }

    public toggleTrash(checked: boolean) {
        const item = this._exportItems.get("trash");
        if (item) {
            item.status = checked ? "enabled" : "disabled";
        }
    }

    public toggleSettings(checked: boolean) {
        const item = this._exportItems.get("settings");
        if (item) {
            item.status = checked ? "enabled" : "disabled";
        }
    }

    public async cancel() {
        this._exporter?.CleanUp();
        this._exporter = undefined;
        this.NavController.back();
    }

    public async stopExport() {
        await this._exporter?.Stop();
    }

    public async exportToZip() {
        this._exportItems.forEach((i, key) => {
            if (i.status != "disabled") {
                i.status = "enabled";
            }
        });

        this._exporter = new BackendExporter();
        if (!(await this._exporter.Initialize())) {
            this.error();
            return;
        }

        const keys = Array.from(this._exportItems.keys());
        for (let i = 0; i < keys.length; i++) {
            const item = this._exportItems.get(keys[i]);
            if (item?.status != "enabled") {
                continue;
            }

            let result = true;
            item.status = "running";
            switch (keys[i]) {
                case "lists":
                    result = await this._exporter.ExportLists(
                        ProgressListenerFactory(done => {
                            item.done = done;
                        }),
                    );
                    break;
                case "trash":
                    result = await this._exporter.ExportTrash(
                        ProgressListenerFactory(done => {
                            item.done = done;
                        }),
                    );
                    break;
                case "settings":
                    result = await this._exporter.ExportSettings(this.Preferences);
                    if (result) {
                        item.done = 1;
                    }
                    break;
            }

            if (!result) {
                item.status = "failed";
                this.error();
                return;
            } else {
                item.status = "success";
            }
        }

        const archive = await this._exporter.Finalize();
        if (archive) {
            this._exportArchive = archive;
        }
    }

    public async Share() {
        if (!this._exportArchive) {
            return;
        }
        const title = this.Locale.getText("page_settings_export.export_success_share_title");
        try {
            await Share.share({
                files: [this._exportArchive],
                dialogTitle: title,
                title: title,
            });
        } catch (e) {
            if (!(e instanceof CapacitorException) || !e.message.includes("canceled")) {
                Logger.Error(`Export: could not share '${this._exportArchive}': `, e);
            }
        }
    }

    public async Listago() {
        if (!this._exportArchive) {
            return;
        }

        try {
            await IntentSender.startActivity({
                action: "android.intent.action.SEND",
                type: "application/zip",
                component: {
                    package: this.Config.ListagoApp,
                    class: "",
                },
                extras: {
                    "android.intent.extra.STREAM": this._exportArchive,
                },
                flags: 1 | 2 /* read and write */,
            });
            this.cancel();
        } catch (e) {
            this.Popups.Toast.Error("page_settings_export.export_success_listago_error", undefined, true);
            Logger.Error(`Export: could not start Listago intent for '${this._exportArchive}': `, e);
        }
    }

    private async error() {
        this._exportItems.forEach(i => {
            if (i.status != "success" && i.status != "disabled") {
                i.status = "failed";
            }
        });
        await this._exporter?.CleanUp();
        this._exporter = undefined;
        await this.Popups.Toast.Error("page_settings_export.export_error", undefined, true);
    }
}

export type ExportItem = {
    locale: string;
    status: "success" | "failed" | "running" | "disabled" | "enabled";
    done: number;
    order: number;
};

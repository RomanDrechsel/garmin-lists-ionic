import { CommonModule } from "@angular/common";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonButton, IonContent, IonIcon, IonSegment, IonSegmentButton, IonSegmentContent, IonSegmentView, IonToggle } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "src/app/components/main-toolbar/main-toolbar.component";

@Component({
    selector: "app-export",
    templateUrl: "./export.page.html",
    styleUrls: ["./export.page.scss"],
    standalone: true,
    imports: [IonToggle, IonButton, IonContent, IonIcon, IonSegment, IonToggle, IonSegmentButton, IonSegmentView, IonSegmentContent, CommonModule, FormsModule, TranslateModule, MainToolbarComponent],
})
export class ExportPage {
    @ViewChild("segbtnLists", { static: false, read: ElementRef }) private _segbtnLists?: ElementRef;
    @ViewChild("segbtnTrash", { static: false, read: ElementRef }) private _segbtnTrash?: ElementRef;
    @ViewChild("segbtnSettings", { static: false, read: ElementRef }) private _segbtnSettings?: ElementRef;
    @ViewChild("segbtnFinish", { static: false, read: ElementRef }) private _segbtnFinish?: ElementRef;

    private _exportLists = true;
    private _exportTrash = true;
    private _exportSettings = true;

    public get ExportLists(): boolean {
        return this._exportLists;
    }

    public get ExportTrash(): boolean {
        return this._exportTrash;
    }

    public get ExportSettings(): boolean {
        return this._exportSettings;
    }

    public get ExportItems(): ExportItem[] {
        return [
            {
                locale: "page_settings_export.export_summary_lists",
                status: this._exportLists ? "enabled" : "disabled",
            },
            {
                locale: "page_settings_export.export_summary_trash",
                status: this._exportTrash ? "enabled" : "disabled",
            },
            {
                locale: "page_settings_export.export_summary_settings",
                status: this._exportSettings ? "enabled" : "disabled",
            },
        ];
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
        this._exportLists = checked;
    }

    public toggleTrash(checked: boolean) {
        this._exportTrash = checked;
    }

    public toggleSettings(checked: boolean) {
        this._exportSettings = checked;
    }

    public async exportToZip() {}
}

type ExportItem = {
    locale: string;
    status: "success" | "error" | "running" | "disabled" | "enabled";
};

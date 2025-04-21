import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, ViewChild } from "@angular/core";
import { IonBackButton, IonButtons, IonHeader, IonMenuButton, IonProgressBar, IonTitle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";

@Component({
    selector: "app-main-toolbar",
    imports: [IonProgressBar, CommonModule, TranslateModule, IonToolbar, IonButtons, IonMenuButton, IonBackButton, IonTitle, IonHeader],
    templateUrl: "./main-toolbar.component.html",
    styleUrl: "./main-toolbar.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainToolbarComponent {
    @Input("title") pageTitle: string = "";
    @Input("back") backButton?: string = undefined;
    @Input("displayMenu") displayMenu: boolean = true;
    @Input("displayCustomMenu") displayCustomMenu: boolean = false;

    @ViewChild("backbutton", { read: IonBackButton }) private backBtn?: IonBackButton;

    private readonly cdr = inject(ChangeDetectorRef);

    private _showProgressbar: boolean = false;

    public get ShowProgressbar(): boolean {
        return this._showProgressbar;
    }

    public get BackLink(): string | undefined {
        return this.backBtn?.defaultHref;
    }

    public ToggleProgressbar(v: boolean) {
        if (this._showProgressbar != v) {
            this._showProgressbar = v;
            console.log("Progressbar: ", v);
            this.cdr.detectChanges();
        }
    }

    public Copy(toolbar?: MainToolbarComponent) {
        if (toolbar) {
            console.log("Progressbar copied", toolbar.ShowProgressbar);
            this.ToggleProgressbar(toolbar.ShowProgressbar);
        }
    }
}

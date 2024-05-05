import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { IonBackButton, IonButtons, IonHeader, IonMenuButton, IonProgressBar, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule } from "@ngx-translate/core";
import { AppService } from "../../services/app/app.service";

@Component({
    selector: 'app-main-toolbar',
    standalone: true,
    imports: [
        IonProgressBar,
        CommonModule,
        TranslateModule,
        IonToolbar,
        IonButtons,
        IonMenuButton,
        IonBackButton,
        IonTitle,
        IonHeader
    ],
    templateUrl: './main-toolbar.component.html',
    styleUrl: './main-toolbar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainToolbarComponent {
    @Input('title') pageTitle: string = "";
    @Input('back') backButton: string = "";
    @Input('menu') menuButton: 'true' | 'false' = "true";

    constructor(private readonly cdr: ChangeDetectorRef) { }

    private _showProgressbar: boolean = false;

    public get ShowProgressbar(): boolean {
        return this._showProgressbar;
    }

    public set ShowProgressbar(v: boolean) {
        if (this._showProgressbar != v) {
            this._showProgressbar = v;
            this.cdr.detectChanges();
        }
    }

    public ngOnInit() {
        AppService.AppToolbar = this;
    }
}

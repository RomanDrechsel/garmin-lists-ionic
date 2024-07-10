import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, ViewEncapsulation, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonHeader, IonTitle, IonToolbar } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";
import { MainToolbarComponent } from "../../../components/main-toolbar/main-toolbar.component";
import { PageBase } from "../../page-base";

@Component({
    selector: "app-policy",
    templateUrl: "./policy.page.html",
    styleUrls: ["./policy.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, MainToolbarComponent, TranslateModule],
})
export class PolicyPage extends PageBase {
    @ViewChild("policy", { read: ElementRef }) private _policy!: ElementRef;

    private readonly http = inject(HttpClient);

    public override async ionViewWillEnter() {
        switch (this.Locale.CurrentLanguage.localeFile) {
            case "de":
                this._policy.nativeElement.innerHTML = await firstValueFrom(this.http.get("./assets/i18n/privacy-policy/de.html", { responseType: "text" }));
                break;
            default:
                this._policy.nativeElement.innerHTML = await firstValueFrom(this.http.get("./assets/i18n/privacy-policy/en.html", { responseType: "text" }));
                break;
        }
    }
}

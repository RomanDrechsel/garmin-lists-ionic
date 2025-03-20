import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonIcon, IonImg, IonTab, IonTabBar, IonTabButton, IonTabs } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { MainToolbarComponent } from "../../components/main-toolbar/main-toolbar.component";
import { PageBase } from "../page-base";

@Component({
    selector: "app-first-start",
    templateUrl: "./first-start.page.html",
    styleUrls: ["./first-start.page.scss"],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [IonTab, IonImg, IonContent, IonTabs, IonTabBar, IonTabButton, IonIcon, CommonModule, FormsModule, TranslateModule, MainToolbarComponent],
})
export class FirstStartPage extends PageBase {}

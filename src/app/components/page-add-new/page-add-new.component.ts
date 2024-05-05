import { CommonModule } from "@angular/common";
import { Component } from '@angular/core';
import { IonImg } from "@ionic/angular/standalone";
import { AppService } from "../../services/app/app.service";

@Component({
    selector: 'app-page-add-new',
    standalone: true,
    imports: [IonImg, CommonModule,],
    templateUrl: './page-add-new.component.html',
    styleUrl: './page-add-new.component.scss',
})
export class PageAddNewComponent {

    public get isDarkMode(): boolean {
        return AppService.Darkmode;
    }
}

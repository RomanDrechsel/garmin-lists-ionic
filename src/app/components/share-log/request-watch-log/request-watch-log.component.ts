import { CommonModule } from "@angular/common";
import { Component } from '@angular/core';

@Component({
    selector: 'app-request-watch-log',
    standalone: true,
    imports: [
        CommonModule,
    ],
    templateUrl: './request-watch-log.component.html',
    styleUrl: './request-watch-log.component.scss',
})
export class RequestWatchLogComponent { }

import { CommonModule } from "@angular/common";
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'app-page-empty',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './page-empty.component.html',
    styleUrl: './page-empty.component.scss',
    encapsulation: ViewEncapsulation.ShadowDom
})
export class PageEmptyComponent { }

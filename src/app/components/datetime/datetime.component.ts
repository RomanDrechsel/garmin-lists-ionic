import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { IonButton, IonButtons, IonDatetime, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { LocalizationService } from "../../services/localization/localization.service";

@Component({
    selector: 'app-datetime',
    standalone: true,
    imports: [
        IonDatetime, IonButtons, IonButton, CommonModule, TranslateModule,
    ],
    templateUrl: './datetime.component.html',
    styleUrl: './datetime.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
})
export class DatetimeComponent {
    @ViewChild('datetime') public datetime?: IonDatetime;

    public selectedDate: string | undefined;

    private readonly ModalCtrl = inject(ModalController);

    private readonly Locale = inject(LocalizationService);

    public Params?: EditorParams;

    public get LocaleString(): string {
        return this.Locale.CurrentLanguage.locale;
    }

    public get FirstDayOfWeek(): number {
        return this.Locale.CurrentLanguage.firstDayOfWeek;
    }

    public get Today(): string {
        return new Date().toISOString();
    }

    public get Preselect(): string | undefined {
        return this.Params?.preselect?.toISOString();
    }

    public async selectToday() {
        if (this.datetime) {
            this.datetime.value = new Date().toISOString();
        }
    }

    public cancel() {
        this.ModalCtrl.dismiss(null, "cancel");
    }

    public async onChange(date: string | string[] | null | undefined) {
        if (typeof (date) == "string") {
            this.ModalCtrl.dismiss(new Date(date), "confirm");
        }
        else {
            this.ModalCtrl.dismiss(null, "cancel");
        }
    }
}

export const SelectDatetime = async function(modalController: ModalController, params?: EditorParams): Promise<Date | undefined> {
    const modal = await modalController.create({
        component: DatetimeComponent,
        componentProps: { Params: params },
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: "autosize-modal",
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm") {
        return data;
    }
    return undefined;
};

declare type EditorParams = {
    preselect?: Date;
};

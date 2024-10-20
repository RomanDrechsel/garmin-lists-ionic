import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ViewChild, inject } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { IonAccordion, IonAccordionGroup, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonNote, IonPicker, IonPickerColumn, IonPickerColumnOption, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { List, ListReset } from "../../services/lists/list";
import { ListsService } from "../../services/lists/lists.service";
import { LocalizationService } from "../../services/localization/localization.service";
import { PopupsService } from "../../services/popups/popups.service";
import { SelectTimeInterval } from "../select-interval/select-interval.component";

@Component({
    selector: "app-list-edit",
    standalone: true,
    imports: [IonText, IonModal, IonNote, IonList, IonAccordion, IonCheckbox, IonAccordionGroup, IonPicker, IonIcon, IonTitle, IonItem, IonInput, IonButton, IonButtons, IonToolbar, IonHeader, IonContent, IonSelect, IonSelectOption, IonPickerColumn, IonPickerColumnOption, CommonModule, TranslateModule, ReactiveFormsModule, FormsModule],
    templateUrl: "./list-editor.component.html",
    styleUrl: "./list-editor.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListEditorComponent {
    @ViewChild("listname", { read: IonInput }) private listname!: IonInput;
    @ViewChild("resetAccordion", { read: IonAccordionGroup }) private resetAccordion!: IonAccordionGroup;
    @ViewChild("reset", { read: IonCheckbox }) private reset!: IonCheckbox;
    @ViewChild("resetinterval", { read: IonSelect }) private resetinterval!: IonSelect;
    public Params?: EditorParams;

    private readonly modalCtrl = inject(ModalController);
    private readonly ListsService = inject(ListsService);
    private readonly Locale = inject(LocalizationService);
    private readonly Popups = inject(PopupsService);
    private readonly cdr = inject(ChangeDetectorRef);

    private formBuilder = inject(FormBuilder);

    private _listReset?: ListReset = undefined;

    public Form: FormGroup;

    constructor() {
        this.Form = this.formBuilder.group({
            listname: ["", [Validators.required]],
        });
    }

    public get ExtendedView(): boolean {
        return this.Params?.extended ?? false;
    }

    public get ResetActive(): boolean {
        return this._listReset?.active ?? false;
    }

    public get ResetInteval(): "daily" | "weekly" | "monthly" {
        return this._listReset?.interval ?? "weekly";
    }

    public get ResetString(): string {
        let str = "";
        if (this._listReset) {
            if (this._listReset.interval == "weekly") {
                switch (this._listReset.weekday) {
                    case 1:
                        str = this.Locale.getText("date.weekday.sun");
                        break;
                    case 2:
                        str = this.Locale.getText("date.weekday.mon");
                        break;
                    case 3:
                        str = this.Locale.getText("date.weekday.tue");
                        break;
                    case 4:
                        str = this.Locale.getText("date.weekday.wed");
                        break;
                    case 5:
                        str = this.Locale.getText("date.weekday.thu");
                        break;
                    case 6:
                        str = this.Locale.getText("date.weekday.fri");
                        break;
                    case 7:
                        str = this.Locale.getText("date.weekday.sat");
                        break;
                }
            } else if (this._listReset.interval == "monthly") {
                if (this._listReset.day > 31) {
                    str = this.Locale.getText("comp-select-interval.last");
                } else {
                    str = this._listReset.day.toString().padStart(2, "0") + ".";
                }
                str += " " + this.Locale.getText("comp-select-interval.ofmonth");
            }

            if (str.length > 0) {
                str += ", ";
            }
            if (this.Locale.CurrentLanguage.h24) {
                str += this._listReset.hour.toString().padStart(2, "0") + ":" + this._listReset.minute.toString().padStart(2, "0") + " " + this.Locale.getText("comp-select-interval.oclock");
            } else {
                let ampm = "";
                if (this._listReset.hour == 0) {
                    str += "12";
                    ampm = "AM";
                } else if (this._listReset.hour < 12) {
                    str += this._listReset.hour;
                    ampm = "AM";
                } else if (this._listReset.hour == 12) {
                    str += "12";
                    ampm = "PM";
                } else {
                    str += this._listReset.hour % 12;
                    ampm = "PM";
                }
                str += ":" + this._listReset.minute.toString().padStart(2, "0") + " " + ampm;
            }
        }
        return str;
    }

    public get Title(): string {
        if (this.Params?.list) {
            return this.Locale.getText("comp-listeditor.title_edit");
        } else {
            return this.Locale.getText("comp-listeditor.title_new");
        }
    }

    public get Confirm(): string {
        if (this.Params?.list) {
            return this.Locale.getText("save");
        } else {
            return this.Locale.getText("create");
        }
    }

    public async ionViewWillEnter() {
        if (this.Params?.list?.Reset) {
            this._listReset = this.Params.list.Reset;
        }
        if (!this._listReset) {
            this._listReset = { interval: "weekly", active: false, hour: 0, minute: 0, day: 1, weekday: this.Locale.CurrentLanguage.firstDayOfWeek };
        }
        this.Form.get("listname")?.setValue(this.Params?.list?.Name);
        if (this.Params?.extended == true) {
            this.reset.checked = this._listReset.active;
            this.toggleReset(undefined);
        }
    }

    public ionViewDidEnter() {
        if (this.Params?.extended != true) {
            this.listname.setFocus();
        }
    }

    public async onSubmit() {
        const listname = this.Form.get("listname")?.value;
        if (!listname || listname.length === 0) {
            return this.cancel();
        }

        let list: List;
        if (this.Params?.list) {
            list = this.Params.list;
            list.Name = listname;
        } else {
            list = await this.ListsService.createNewListObj({ name: listname });
        }
        list.Reset = this._listReset;
        return this.modalCtrl.dismiss(list, "confirm");
    }

    public cancel() {
        return this.modalCtrl.dismiss(null, "cancel");
    }

    public toggleReset(event: any) {
        if (this.resetAccordion && this.reset) {
            this.resetAccordion.value = this.reset.checked ? "reset" : undefined;
            if (this._listReset) {
                this._listReset.active = this.reset.checked ?? false;
            }
        }
        event?.stopImmediatePropagation();
    }

    public async resetInfo(event: any) {
        event?.stopImmediatePropagation();
        await this.Popups.Alert.Show({
            message: "comp-listeditor.reset_info",
            translate: true,
            cssClass: "info",
        });
    }

    public onResetIntervalChanged(value: string) {
        this._listReset!.interval = value as "daily" | "weekly" | "monthly";
        this.cdr.detectChanges();
    }

    public async selectResetDate() {
        if (this.resetinterval && this._listReset) {
            const ret = await SelectTimeInterval(this.modalCtrl, this._listReset);
            if (ret) {
                this._listReset = ret;
                this.cdr.detectChanges();
            }
        }
    }
}

export const ListEditor = async function (modalController: ModalController, params: EditorParams): Promise<List | undefined> {
    const modal = await modalController.create({
        component: ListEditorComponent,
        componentProps: { Params: params },
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: "autosize-modal",
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm") {
        return data as List;
    }
    return undefined;
};

export declare type EditorParams = {
    list?: List;
    extended?: boolean;
};

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject } from "@angular/core";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { IonButton, IonButtons, IonHeader, IonIcon, IonInput, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Locale } from "../../../services/localization/locale";

@Component({
    selector: "app-marker-editor",
    standalone: true,
    imports: [IonButton, IonInput, IonButtons, IonIcon, IonTitle, IonToolbar, IonHeader, CommonModule, TranslateModule, ReactiveFormsModule],
    templateUrl: "./marker-editor.component.html",
    styleUrl: "./marker-editor.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkerEditorComponent implements OnInit {
    @ViewChild("label") private markerLabel!: IonInput;

    public Params?: EditorParams;
    private modalCtrl = inject(ModalController);

    public Form: FormGroup;

    constructor(formbuilder: FormBuilder) {
        this.Form = formbuilder.group({
            label: ["", [Validators.required]],
        });
    }

    public ngOnInit() {
        this.Form.get("label")?.setValue(this.Params?.label);
    }

    public ionViewDidEnter() {
        this.markerLabel.setFocus();
    }

    public get Title(): string {
        return Locale.getText("comp-markereditor.title");
    }

    public get Confirm(): string {
        return Locale.getText("save");
    }

    public onSubmit() {
        return this.modalCtrl.dismiss(String(this.Form.get("label")?.value).trim(), "confirm");
    }

    public cancel() {
        return this.modalCtrl.dismiss(null, "cancel");
    }
}

export const MapMarkerEditor = async function (modalController: ModalController, params?: EditorParams): Promise<string | undefined> {
    const modal = await modalController.create({
        component: MarkerEditorComponent,
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
    label?: string;
};

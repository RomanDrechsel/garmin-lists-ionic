import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from '@ngx-translate/core';
import { Locale } from "../../services/localization/locale";

@Component({
    selector: 'app-list-edit',
    standalone: true,
    imports: [IonIcon, IonTitle, IonItem, IonInput, IonButton, IonButtons, IonToolbar, IonHeader, IonContent, CommonModule, TranslateModule, ReactiveFormsModule, FormsModule],
    templateUrl: './list-editor.component.html',
    styleUrl: './list-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListEditorComponent implements OnInit {
    @ViewChild('listname') private listname!: IonInput;
    public Params?: EditorParams;

    public Form: FormGroup;

    constructor(private modalCtrl: ModalController, formbuilder: FormBuilder) {
        this.Form = formbuilder.group({
            listname: ['', [Validators.required]],
        });
    }

    ngOnInit() {
        this.Form.get("listname")?.setValue(this.Params?.listname);
    }

    public ionViewDidEnter() {
        this.listname.setFocus();
    }


    public get Title(): string {
        if (this.Params?.purpose == 'edit') {
            return Locale.getText("comp-listeditor.title_edit");
        }
        else {
            return Locale.getText("comp-listeditor.title_new");
        }
    }

    public get Confirm(): string {
        if (this.Params?.purpose == 'edit') {
            return Locale.getText("save");
        }
        else {
            return Locale.getText("create");
        }
    }

    public onSubmit() {
        return this.modalCtrl.dismiss(String(this.Form.get("listname")?.value).trim(), 'confirm');
    }

    public cancel() {
        return this.modalCtrl.dismiss(null, 'cancel');
    }
}

export const ListEditor = async function(modalController: ModalController, params?: EditorParams): Promise<string | undefined> {
    const modal = await modalController.create({
        component: ListEditorComponent,
        componentProps: { Params: params },
        animated: true,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'autosize-modal'
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
        return data;
    }
    return undefined;
};

declare type EditorParams = {
    purpose?: 'new' | 'edit';
    listname?: string;
};

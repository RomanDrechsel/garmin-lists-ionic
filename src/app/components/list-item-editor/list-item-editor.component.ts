import { CommonModule } from "@angular/common";
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { IonButton, IonButtons, IonHeader, IonIcon, IonInput, IonTextarea, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { Locale } from "../../services/localization/locale";

@Component({
    selector: 'app-list-item-editor',
    standalone: true,
    imports: [
        IonTextarea,
        IonInput,
        IonIcon,
        IonButton,
        IonButtons,
        IonTitle,
        IonToolbar,
        IonHeader,
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule
    ],
    templateUrl: './list-item-editor.component.html',
    styleUrl: './list-item-editor.component.scss',
})
export class ListItemEditorComponent implements OnInit {
    @ViewChild('itemname') private itemname!: IonTextarea;
    public Params?: EditorParams;
    public Form: FormGroup;

    constructor(private modalCtrl: ModalController, formbuilder: FormBuilder) {
        this.Form = formbuilder.group({
            item: ['', [Validators.required]],
            note: ['']
        });
    }

    ngOnInit() {
        this.Form.get("item")?.setValue(this.Params?.item);
        this.Form.get("note")?.setValue(this.Params?.note);
    }

    public get Title(): string {
        if (this.Params?.purpose == 'edit') {
            return Locale.getText("comp-listitemeditor.title_edit");
        }
        else {
            return Locale.getText("comp-listitemeditor.title_new");
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

    public ionViewDidEnter() {
        this.itemname.setFocus();
    }

    public onSubmit() {
        let item = this.Form.get("item")?.value;
        if (item) {
            item = item.trim();
        }
        let note = this.Form.get("note")?.value;
        if (note) {
            note = note.trim();
        }
        return this.modalCtrl.dismiss({ item: item, note: note }, 'confirm');
    }

    public cancel() {
        return this.modalCtrl.dismiss(null, 'cancel');
    }
}


export const ListItemEditor = async function(modalController: ModalController, params?: EditorParams): Promise<ListItemEditorReturn | undefined> {
    const modal = await modalController.create({
        component: ListItemEditorComponent,
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

type EditorParams = {
    purpose?: 'new' | 'edit';
    item?: string;
    note?: string;
};

export type ListItemEditorReturn = {
    item: string;
    note?: string;
};

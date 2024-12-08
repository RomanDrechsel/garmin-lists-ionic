import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { IonButton, IonButtons, IonCheckbox, IonHeader, IonIcon, IonItem, IonTextarea, IonTitle, IonToolbar, ModalController } from "@ionic/angular/standalone";
import { TranslateModule } from "@ngx-translate/core";
import { List } from "../../services/lists/list";
import { Listitem } from "../../services/lists/listitem";
import { ListsService } from "../../services/lists/lists.service";
import { PopupsService } from "../../services/popups/popups.service";
import { Locale } from "./../../services/localization/locale";

@Component({
    selector: "app-list-item-editor",
    imports: [IonTextarea, IonIcon, IonButton, IonButtons, IonTitle, IonItem, IonToolbar, IonHeader, IonCheckbox, CommonModule, TranslateModule, ReactiveFormsModule, FormsModule],
    templateUrl: "./list-item-editor.component.html",
    styleUrl: "./list-item-editor.component.scss",
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListItemEditorComponent implements OnInit {
    @ViewChild("itemname") private itemname!: IonTextarea;
    public Params?: EditorParams;
    public Form: FormGroup;

    public readonly Popups = inject(PopupsService);
    private readonly ListsService = inject(ListsService);

    constructor(private modalCtrl: ModalController, formbuilder: FormBuilder) {
        this.Form = formbuilder.group({
            item: ["", [Validators.required]],
            note: [""],
            hidden: [false],
            locked: [false],
        });
    }

    public ngOnInit() {
        this.Form.get("item")?.setValue(this.Params?.item?.Item ?? "");
        this.Form.get("note")?.setValue(this.Params?.item?.Note ?? "");
        this.Form.get("locked")?.setValue(this.Params?.item?.Locked ?? false);
        this.Form.get("hidden")?.setValue(this.Params?.item?.Hidden ?? false);
    }

    public get Title(): string {
        if (this.Params?.item) {
            return Locale.getText("comp-listitemeditor.title_edit");
        } else {
            return Locale.getText("comp-listitemeditor.title_new");
        }
    }

    public get Confirm(): string {
        if (this.Params?.item) {
            return Locale.getText("save");
        } else {
            return Locale.getText("create");
        }
    }

    public ionViewDidEnter() {
        if (this.Params?.item == undefined) {
            this.itemname.setFocus();
        }
    }

    public async onSubmit() {
        if (this.Params?.list == undefined) {
            this.cancel();
            return;
        }

        let title = this.Form.get("item")?.value;
        if (title) {
            title = title.trim();
        } else {
            return;
        }
        let note = this.Form.get("note")?.value;
        if (note) {
            note = note.trim();
        }
        if (note.length <= 0) {
            note = undefined;
        }

        const hidden = (this.Form.get("hidden")?.value as boolean) ?? false;
        const locked = (this.Form.get("locked")?.value as boolean) ?? false;

        let item: Listitem;
        if (this.Params?.item) {
            item = this.Params.item;
            item.Item = title;
            item.Note = note;
            item.Hidden = hidden;
            item.Locked = locked;
        } else {
            item = await this.ListsService.createNewListitemObj(this.Params!.list!, { item: title, note: note, hidden: hidden, locked: locked });
        }

        return this.modalCtrl.dismiss(item, "confirm");
    }

    public async onDelete() {
        if (this.Params?.list && this.Params?.item && (await this.ListsService.DeleteListitem(this.Params.list, this.Params.item))) {
            this.cancel();
        }
    }

    public cancel() {
        return this.modalCtrl.dismiss(null, "cancel");
    }

    public async clickInfoHidden(event: any) {
        event?.stopImmediatePropagation();
        await this.Popups.Alert.Info({
            message: "comp-listitemeditor.hidden_info",
            translate: true,
        });
    }

    public async clickInfoLocked(event: any) {
        event?.stopImmediatePropagation();
        await this.Popups.Alert.Info({
            message: "comp-listitemeditor.locked_info",
            translate: true,
        });
    }
}

export const ListItemEditor = async function (modalController: ModalController, params: EditorParams): Promise<Listitem | undefined> {
    const modal = await modalController.create({
        component: ListItemEditorComponent,
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

type EditorParams = {
    list: List;
    item?: Listitem;
};

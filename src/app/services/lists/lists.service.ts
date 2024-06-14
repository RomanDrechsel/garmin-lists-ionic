import { Injectable, inject } from "@angular/core";
import { Keyboard } from "@capacitor/keyboard";
import { ModalController } from "@ionic/angular/standalone";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { ListEditor } from "../../components/list-editor/list-editor.component";
import { AppService } from "../app/app.service";
import { Logger } from "../logging/logger";
import { PopupsService } from "../popups/popups.service";
import { EPrefProperty, PreferencesService } from "../storage/preferences.service";
import { KeepInTrash } from "./keep-in-trash";
import { List } from "./list";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class ListsService {
    private onListsDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onListsDatasetChanged$ = this.onListsDatasetChangedSubject.asObservable();
    private onTrashDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onTrashDatasetChanged$ = this.onTrashDatasetChangedSubject.asObservable();

    private readonly Lists = inject(ListsProviderService);
    private readonly Preferences = inject(PreferencesService);
    private readonly ModalCtrl = inject(ModalController);
    private readonly Popups = inject(PopupsService);

    private _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;
    private _removeOldTrashEntriesTimer?: Subscription;

    public async Initialize() {
        this.KeepInTrashStock = await this.Preferences.Get<number>(EPrefProperty.TrashKeepinStock, this._keepInTrashStock);
        this.Preferences.onPrefChanged$.subscribe(arg => {
            if (arg.prop == EPrefProperty.TrashKeepinStock) {
                this.KeepInTrashStock = arg.value;
            }
        });
    }

    private set KeepInTrashStock(value: number | KeepInTrash.Enum) {
        value = KeepInTrash.FromNumber(value);
        this._keepInTrashStock = value;
        if (KeepInTrash.StockPeriod(value)) {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = interval(value * 60 * 60 * 24).subscribe(() => {
                this.removeOldTrashEntries(value * 60 * 60 * 24);
            });
            this.removeOldTrashEntries(value * 60 * 60 * 24);
        } else {
            this._removeOldTrashEntriesTimer?.unsubscribe();
            this._removeOldTrashEntriesTimer = undefined;
            this.checkTrashLimit();
        }
    }

    /**
     * read all lists from storage
     * @param full_data read all data from backend, with all items etc
     * @returns array of all lists
     */
    public async GetLists(full_data: boolean = false): Promise<List[]> {
        return this.Lists.GetLists(full_data);
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | null> {
        return this.Lists.GetList(uuid);
    }

    /**
     * opens the list editor to create a new list
     */
    public async NewList() {
        if (AppService.isMobileApp) {
            await Keyboard.show();
        }
        const listname = await ListEditor(this.ModalCtrl);
        if (listname) {
            const list = List.Create({ name: listname, uuid: await this.createUuid(), order: (await this.GetLists()).length });
            if (await this.StoreList(list)) {
                Logger.Notice(`Created new list ${list.toLog()}`);
                this.Router.navigateByUrl(`/lists/items/${list.Uuid}`);
            } else {
                this.Popups.Toast.Error("service-lists.store_list_error");
            }
        }
    }

    /**
     * stores a list in backend up there are any changes
     * @param list list to be stored
     * @param force store the list, even if there are no changes
     * @returns storage successful
     */
    public async StoreList(list: List, force: boolean = false): Promise<boolean> {
        return false;
    }

    /**
     * removes all lists and listitems in the trash, which were deleted a certain amount of seconds ago
     * @param seconds amount of secconds
     */
    private async removeOldTrashEntries(seconds: number) {}

    /**
     * checks if there are more lists in the trash, than the limit allows
     */
    private async checkTrashLimit() {}
}

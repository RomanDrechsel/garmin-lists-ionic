import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from "rxjs";
import { HelperUtils } from "../../classes/utils/helperutils";
import { LocalizationService } from "../localization/localization.service";
import { KeepInTrash } from "./keep-in-trash";
import { List } from "./list";
import { Listitem } from "./listitem";

@Injectable({
    providedIn: 'root'
})
export class ListsService {
    private onListsDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onListsDatasetChanged$ = this.onListsDatasetChangedSubject.asObservable();
    private onTrashDatasetChangedSubject = new BehaviorSubject<List[] | undefined>(undefined);
    public onTrashDatasetChanged$ = this.onTrashDatasetChangedSubject.asObservable();

    public _keepInTrashStock: KeepInTrash.Enum = KeepInTrash.Default;

    private Locale = inject(LocalizationService);

    public async Initialize() {
    }

    /**
     * gets all lists
     * @returns array of all lists
     */
    public async GetLists(): Promise<List[]> {

        if (this.Locale.currentLang == "de") {
            return [
                List.fromBackend({ uuid: await this.createUuid(), name: "Wocheneinkäufe", created: Date.now(), order: 0, updated: Date.now() - 3456 * 1000, itemscount: 5 })!,
                List.fromBackend({ uuid: await this.createUuid(), name: "Muttis Geburtstags-Fete", created: Date.now(), order: 1, updated: Date.now() - (60 * 60 * 36 * 1000), itemscount: 12 })!,
                List.fromBackend({ uuid: await this.createUuid(), name: "Putzplan", created: Date.now(), order: 2, updated: Date.now() - (60 * 60 * 24 * 7 * 1000), itemscount: 4 })!,
            ];
        }
        else {
            return [
                List.fromBackend({ uuid: await this.createUuid(), name: "Weekly groceries", created: Date.now(), order: 0, updated: Date.now() - 3456 * 1000, itemscount: 5 })!,
                List.fromBackend({ uuid: await this.createUuid(), name: "Mom's birthday party", created: Date.now(), order: 1, updated: Date.now() - (60 * 60 * 36 * 1000), itemscount: 12 })!,
                List.fromBackend({ uuid: await this.createUuid(), name: "Cleaning plan", created: Date.now(), order: 2, updated: Date.now() - (60 * 60 * 24 * 7 * 1000), itemscount: 4 })!,
            ];
        }
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | null> {
        if (this.Locale.currentLang == "de") {
            const list = List.fromBackend({ uuid: uuid, name: "Wocheneinkäufe", created: Date.now(), order: 0, updated: Date.now() - 3456 * 1000, itemscount: 7 })!;
            list.Items = [
                Listitem.fromBackend({ id: 1, order: 0, item: "Brot", created: Date.now() - (60 * 60 * 4 * 1000) })!,
                Listitem.fromBackend({ id: 2, order: 1, item: "Butter", created: Date.now() - (60 * 60 * 2.1 * 1000) })!,
                Listitem.fromBackend({ id: 3, order: 2, item: "Eier", created: Date.now() - (60 * 60 * 9.2 * 1000) })!,
                Listitem.fromBackend({ id: 4, order: 3, item: "Milch", note: "Laktose-frei", created: Date.now() - (60 * 60 * 12.35 * 1000) })!,
                Listitem.fromBackend({ id: 5, order: 4, item: "Eiscreme", note: "Ist im Angebot", created: Date.now() - (60 * 60 * 0.23 * 1000) })!,
            ];

            return list;
        }
        else {
            const list = List.fromBackend({ uuid: uuid, name: "Weekly groceries", created: Date.now(), order: 0, updated: Date.now() - 3456 * 1000, itemscount: 7 })!;
            list.Items = [
                Listitem.fromBackend({ id: 1, order: 0, item: "bread", created: Date.now() - (60 * 60 * 4 * 1000) })!,
                Listitem.fromBackend({ id: 2, order: 1, item: "butter", created: Date.now() - (60 * 60 * 2.1 * 1000) })!,
                Listitem.fromBackend({ id: 3, order: 2, item: "8 eggs", created: Date.now() - (60 * 60 * 9.2 * 1000) })!,
                Listitem.fromBackend({ id: 4, order: 3, item: "milk", note: "lactose-free", created: Date.now() - (60 * 60 * 12.35 * 1000) })!,
                Listitem.fromBackend({ id: 5, order: 4, item: "Ice cream", note: "on sale", created: Date.now() - (60 * 60 * 0.23 * 1000) })!,
            ];

            return list;
        }
    };

    /**
     * gets all lists in trash
     * @returns array of all lists in trash
     */
    public async GetTrash(): Promise<List[]> {
        return [];
    };

    /**
     * gets a specific list OUTSIDE of trash and its listitems in Trash
     * @param uuid unique id of the list OUTSIDE of trash
     * @returns List object
     */
    public async GetListItemsFromTrash(uuid: string): Promise<List | undefined> {
        return undefined;
    };

    /**
     * opens the list editor to create a new list
     */
    public async NewList() { }

    /**
     * opens the list editor to edit the title of a list
     * @param list list to be edited
     */
    public async EditList(list: List) { }

    /**
     * prompts the user to delete a list
     * @param list list to be deleted
     * @param force delete the list without prompt
     * @returns list deletion successful? undefined if the user canceled it
     */
    public async DeleteList(list: List, force: boolean = false): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to delete all items of a list
     * @param list list to be emptied
     * @param force empty the list without prompt
     * @returns deletion successful? undefined if user canceled it
     */
    public async EmptyList(list: List, force: boolean = false): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * opens the listitem editor to create a new listitem
     * @param list list, the new item should be part of
     * @returns item-creation successful?
     */
    public async NewListitem(list: List): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * opens the listitem editor to edit an item
     * @param list list, the item is part of
     * @param item item to be edited
     * @returns editing successful? undefined if user canceled it
     */
    public async EditListitem(list: List, item: Listitem): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to delete an list item
     * @param list list, the item is part of
     * @param item item to be deleted
     * @param force delete the listitem without prompting
     * @returns deletion successful? undefined if user canceled it
     */
    public async DeleteListitem(list: List, item: Listitem, force: boolean = false): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to finally erase a listitem from trash
     * @param list the list OUTSIDE the trash, the item is part of
     * @param item the item in Trash to be erased
     * @returns erase successful, undefined if user canceled it
     */
    public async EraseListitemFromTrash(list: List, item: Listitem): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to empty the lists trash
     * @returns empty successfull, undefined if user canceled it
     */
    public async EmptyTrash(): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * removes all listitems from trash for a certain list
     * @param list the list, the items in trash should be removed
     * @returns removal successful? undefined if the user canceled it
     */
    public async EmptyListitemTrash(list: List): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * correct the order numbers of lists
     * @param lists lists to be ordered
     * @returns lists with updated order numbers
     */
    public async ReorderLists(lists: List[]): Promise<List[]> {
        return lists;
    };

    /**
     * correct the order numbers of listitems
     * @param list list, the items are part of
     * @param items items to be ordered
     * @returns list with reordered listitems
     */
    public async ReorderListitems(list: List, items: Listitem[]): Promise<List> {
        return list;
    };

    /**
     * toggles the hidden state of a listitem
     * @param list list, the item is part of
     * @param item listitem, hiddenstate should be toggled
     */
    public async ToggleHiddenListitem(list: List, item: Listitem) { }

    /**
     * prompts the user to erase a list from trash
     * @param list list to be erased
     * @param force erase the list without user prompt
     * @returns erase successful? undefined if user canceled it
     */
    public async EraseListFromTrash(list: List, force: boolean = false): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to restore a list from trash
     * @param list list to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListFromTrash(list: List): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * prompts the user to restore a list item
     * @param list list, to which the item should be restored
     * @param item item in TRASH to be restored
     * @returns restore successful? undefined if user canceled it
     */
    public async RestoreListitemFromTrash(list: List, item: Listitem): Promise<boolean | undefined> {
        return undefined;
    };

    /**
     * creates a unique list id
     * @returns unique id
     */
    public async createUuid(): Promise<string> {
        return HelperUtils.createUUID(20);
    }
}

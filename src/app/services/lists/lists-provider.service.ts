import { Injectable } from "@angular/core";
import { List } from "./list";

@Injectable({
    providedIn: "root",
})
export class ListsProviderService {
    /**
     * read all lists from storage
     * @param full_data read all data from backend, with all items etc
     * @returns array of all lists
     */
    public async GetLists(full_data: boolean): Promise<List[]> {
        return [];
    }

    /**
     * gets a specific list with all items
     * @param uuid unique id of the list
     * @returns List object
     */
    public async GetList(uuid: string): Promise<List | null> {
        return null;
    }
}

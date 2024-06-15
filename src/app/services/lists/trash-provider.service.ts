import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { List } from "./list";
import { ListsProviderService } from "./lists-provider.service";

@Injectable({
    providedIn: "root",
})
export class TrashProviderService extends ListsProviderService {
    protected override StoragePath = "trash";

    public TrashChangedSubject = new BehaviorSubject<List[]>([]);
    /**
     * remove all lists from trash,
     * @param seconds
     */
    public async RemoveOldEntries(seconds: number) {
        if ((await this.Backend.RemoveOldFiles(seconds, this.StoragePath)) > 0) {
            this.TrashChangedSubject.next(await this.GetLists());
        }
    }

    /**
     * removes the oldes entries in trash doe to a certain number
     * @param maxcount maximum number of lists in trash
     */
    public async CheckLimit(maxcount?: number) {
        if (maxcount && (await this.Backend.LimitFiles(maxcount, this.StoragePath)) > 0) {
            this.TrashChangedSubject.next(await this.GetLists());
        }
    }
}

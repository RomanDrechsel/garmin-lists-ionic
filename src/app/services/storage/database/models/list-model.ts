import { ListitemModel } from "./listitem-model";

export declare type ListModel = {
    uuid: string,
    name: string,
    created: number,
    order: number,
    updated?: number | null,
    items?: ListitemModel[],
    itemscount?: number;
};

import type { FileBackendListitemModel } from "./file-backend-listitem-model";

export declare type FileBackendListModel = {
    uuid: string | number;
    name: string;
    created: number;
    order: number;
    updated?: number;
    deleted?: number;
    reset?: FileBackendListReset;
    sync?: boolean;
    items?: FileBackendListitemModel[];
};

export declare type FileBackendListReset = {
    active: boolean;
    interval: "daily" | "weekly" | "monthly";
    hour: number;
    minute: number;
    day: number;
    weekday: number;
};

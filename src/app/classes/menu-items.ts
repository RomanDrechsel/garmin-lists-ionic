
export const MenuItemLists = function(): MenuItem {
    return {
        Id: "lists",
        Title: "mainmenu.lists",
        Icon: "./assets/icons/menu/lists.svg",
        Url: "/lists"
    };
};

export const MenuItemListsTrash = function(hide: boolean = false): MenuItem {
    return {
        Id: "trash",
        Title: "mainmenu.trash",
        Icon: "./assets/icons/menu/trash.svg",
        Url: "/trash",
        Hide: hide,
    };
};

export const MenuItemListitemsTrash = function(list_uuid: string, hide: boolean = false): MenuItem {
    return {
        Id: "trash",
        Title: "mainmenu.trash",
        Icon: "./assets/icons/menu/trash_items.svg",
        Url: `/trash/items/${list_uuid}`,
        Hide: hide,
    };
};

export const MenuItemDevices = function(): MenuItem {
    return {
        Id: "devices",
        Title: "mainmenu.devices",
        Icon: "./assets/icons/menu/devices.svg",
        Url: "/devices"
    };
};

export const MenuItemSettings = function(): MenuItem {
    return {
        Id: "settings",
        Title: "mainmenu.settings",
        Icon: "./assets/icons/menu/settings.svg",
        Url: "/settings"
    };
};

export const MenuItemAppInfos = function(): MenuItem {
    return {
        Id: "appinfos",
        Title: "mainmenu.appinfos",
        Icon: "./assets/icons/menu/appinfos.svg",
        Url: "/appinfos"
    };
};

export const MenuItemEmptyList = function(onclick: () => Promise<boolean>): MenuItem {
    return {
        Id: "emptylist",
        Title: "page_listitems.menu_empty",
        Icon: "./assets/icons/menu/empty.svg",
        onClick: onclick
    };
};

export const MenuItemEmptyListTrash = function(onclick: () => Promise<boolean>): MenuItem {
    return {
        Id: "emptytrash",
        Title: "mainmenu.empty_trash",
        Icon: "./assets/icons/menu/empty_trash.svg",
        onClick: onclick
    };
};

export declare type MenuItem = {
    Id: string;
    Title: string;
    Icon?: string;
    IconName?: string;
    Url?: string;
    Hide?: boolean;
    onClick?: () => Promise<boolean>;
};

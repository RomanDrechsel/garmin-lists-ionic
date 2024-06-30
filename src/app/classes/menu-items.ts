export const MenuItemLists = function (): MenuItem {
    return {
        Id: "lists",
        Title: "mainmenu.lists",
        Icon: "./assets/icons/menu/lists.svg",
        Url: "/lists",
        Disabled: false,
    };
};

export const MenuItemListsTrash = function (disabled: boolean): MenuItem {
    return {
        Id: "trash",
        Title: "mainmenu.trash",
        Icon: "./assets/icons/menu/trash.svg",
        Url: "/trash",
        Disabled: disabled,
    };
};

export const MenuItemListitemsTrash = function (list_uuid: string, disabled: boolean): MenuItem {
    return {
        Id: "trash",
        Title: "mainmenu.trash",
        Icon: "./assets/icons/menu/trash_items.svg",
        Url: `/trash/items/${list_uuid}`,
        Disabled: disabled,
    };
};

export const MenuItemDevices = function (): MenuItem {
    return {
        Id: "devices",
        Title: "mainmenu.devices",
        Icon: "./assets/icons/menu/devices.svg",
        Url: "/devices",
        Disabled: false,
    };
};

export const MenuItemSettings = function (): MenuItem {
    return {
        Id: "settings",
        Title: "mainmenu.settings",
        Icon: "./assets/icons/menu/settings.svg",
        Url: "/settings",
        Disabled: false,
    };
};

export const MenuItemAppInfos = function (): MenuItem {
    return {
        Id: "appinfos",
        Title: "mainmenu.appinfos",
        Icon: "./assets/icons/menu/appinfos.svg",
        Url: "/appinfos",
        Disabled: false,
    };
};

export const MenuItemPrivacy = function (): MenuItem {
    return {
        Id: "privacy",
        Title: "mainmenu.privacy",
        Icon: "./assets/icons/menu/privacy.svg",
        Url: "/privacy-policy/privacy",
        Disabled: false,
    };
};

export const MenuItemEmptyList = function (onclick?: () => Promise<boolean>, disabled?: boolean): MenuItem {
    return {
        Id: "emptylist",
        Title: "page_listitems.menu_empty",
        Icon: "./assets/icons/menu/empty.svg",
        onClick: onclick,
        Disabled: disabled ?? false,
    };
};

export const MenuItemEmptyListTrash = function (onclick?: () => Promise<boolean>, disabled?: boolean): MenuItem {
    return {
        Id: "emptytrash",
        Title: "mainmenu.empty_trash",
        Icon: "./assets/icons/menu/empty_trash.svg",
        onClick: onclick,
        Disabled: disabled ?? false,
    };
};

export const MenuItemGeoFancing = function (uuid: string, disabled: boolean): MenuItem {
    return {
        Id: "geofancing",
        Title: "mainmenu.geofencing",
        Icon: "./assets/icons/menu/geofencing.svg",
        Url: `/lists/geofencing/${uuid}`,
        Disabled: disabled,
    };
};

export declare type MenuItem = {
    Id: string;
    Title: string;
    Disabled: boolean;
    Icon?: string;
    IconName?: string;
    Url?: string;
    onClick?: () => Promise<boolean>;
};

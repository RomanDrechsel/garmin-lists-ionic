import { Routes } from "@angular/router";

export const routes: Routes = [
    {
        path: "",
        redirectTo: "lists",
        pathMatch: "full",
    },
    {
        path: "lists",
        loadComponent: () => import("./pages/lists/lists/lists.page").then(m => m.ListsPage),
    },
    {
        path: "lists/items/:uuid",
        loadComponent: () => import("./pages/lists/list-items/list-items.page").then(m => m.ListItemsPage),
    },
    {
        path: "trash",
        loadComponent: () => import("./pages/lists/trash-lists/trash-lists.page").then(m => m.TrashListsPage),
    },
    {
        path: "trash/items/:uuid",
        loadComponent: () => import("./pages/lists/trash-listitems/trash-listitems.page").then(m => m.TrashListitemsPage),
    },
    {
        path: "devices",
        loadComponent: () => import("./pages/devices/devices.page").then(m => m.DevicesPage),
    },
    {
        path: "settings",
        loadComponent: () => import("./pages/settings/settings/settings.page").then(m => m.SettingsPage),
    },
    {
        path: "settings/logs",
        loadComponent: () => import("./pages/settings/showlogs/showlogs.page").then(m => m.ShowlogsPage),
    },
    {
        path: "settings/logging",
        loadComponent: () => import("./pages/settings/logging/logging.page").then(m => m.LoggingPage),
    },
    {
        path: "settings/confirmations",
        loadComponent: () => import("./pages/settings/confirmations/confirmations.page").then(m => m.ConfirmationsPage),
    },
    {
        path: "settings/trash",
        loadComponent: () => import("./pages/settings/trash-settings/trash-settings.page").then(m => m.TrashSettingsPage),
    },
    {
        path: "appinfo",
        loadComponent: () => import("./pages/appinfos/appinfos.page").then(m => m.AppinfosPage),
    },
    {
        path: "privacy-policy/privacy",
        loadComponent: () => import("./pages/privacy-policy/privacy/privacy.page").then(m => m.PrivacyPage),
    },
    {
        path: "privacy-policy/policy",
        loadComponent: () => import("./pages/privacy-policy/policy/policy.page").then(m => m.PolicyPage),
    },
];

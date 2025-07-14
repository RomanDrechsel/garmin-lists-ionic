import { Plugin, type PluginListenerHandle } from "@capacitor/core";

export interface ISysInfo extends Plugin {
    DisplayDensity(): Promise<{ density: number }>;
    NightMode(): Promise<{ isNightMode: boolean }>;
    Logcat(args: { level: "d" | "n" | "i" | "e"; message: string }): Promise<void>;
    AppInstalled(args: { packageName: string; silent?: boolean }): Promise<{ installed: boolean }>;
    SendExportToListago(args: { zip: string; dev?: boolean }): Promise<{ success: boolean }>;

    addListener<T>(eventName: string, listenerFunc: (data: T) => void): Promise<PluginListenerHandle>;
}

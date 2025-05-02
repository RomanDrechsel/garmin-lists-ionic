import { Plugin, type PluginListenerHandle } from "@capacitor/core";

export interface ISysInfo extends Plugin {
    DisplayDensity(): Promise<{ density: number }>;
    NightMode(): Promise<{ isNightMode: boolean }>;
    addListener<T>(eventName: string, listenerFunc: (data: T) => void): Promise<PluginListenerHandle>;
}

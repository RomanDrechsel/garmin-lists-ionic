import { FileInfo } from "@capacitor/filesystem";
import { Share as SharePlugin } from "@capacitor/share";

export namespace ShareUtil {
    export const SendMail = async function(args: { files?: FileInfo | FileInfo[] | string | string[], title?: string; text?: string; }): Promise<boolean> {
        return false;
    };

    export const Share = async function(args: { files?: FileInfo | FileInfo[] | string | string[], title?: string; text?: string; }): Promise<boolean> {
        if (!args.files && !args.title && !args.text) {
            return false;
        }

        if (args.files) {
            if (!Array.isArray(args.files)) {
                if (typeof args.files == "string") {
                    args.files = [args.files];
                }
                else {
                    args.files = [args.files.uri];
                }
            }
            else {
                args.files = args.files.map(f => typeof f == "string" ? f : f.uri);
            }
        }

        await SharePlugin.share({
            files: args.files as string[],
            title: args.title,
            text: args.text,
        });
        return true;
    };
};

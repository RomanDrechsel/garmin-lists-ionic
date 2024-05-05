import { AlertButton, AlertController, AlertInput, AlertOptions } from "@ionic/angular/standalone";
import { LocalizationService } from "../localization/localization.service";

export class Alert {
    public constructor(private Controller: AlertController, private Locale: LocalizationService) { }

    public async Show(opts: {
        message: string,
        buttons?: (string | AlertButton)[],
        header?: string,
        inputs?: AlertInput[],
        translate?: boolean,
        ok_action?: () => Promise<void>,
    }): Promise<any> {
        //at least an ok button
        if (!opts.buttons || opts.buttons.length == 0) {
            opts.buttons = opts.translate ? ["ok"] : [this.Locale.getText("ok")];
        }

        //translate if nessesary
        if (opts.translate) {
            let keys: string[] = [opts.message];
            if (opts.header) {
                keys.push(opts.header);
            }
            opts.buttons.forEach(b => {
                if (typeof b === "string") {
                    keys.push(b);
                }
                else {
                    keys.push(b.text);
                }
            });

            const locale = this.Locale.getText(keys);
            opts.message = locale[opts.message];
            if (opts.header) {
                opts.header = locale[opts.header];
            }
            for (let i = 0; i < opts.buttons.length; i++) {
                const t = opts.buttons[i];
                if (typeof t === "string") {
                    opts.buttons[i] = locale[t];
                }
                else {
                    t.text = locale[t.text];
                }
            }
        }

        let buttons: AlertButton[] = [];
        opts.buttons.forEach(b => {
            if (typeof b === "string") {
                const role = buttons.length == 0 ? "confirm" : "cancel";
                buttons.push(Alert.createButton(b, role, role === "confirm" ? opts.ok_action : undefined));
            }
            else {
                buttons.push(b);
            }
        });

        const opt: AlertOptions = {
            message: opts.message,
            header: opts.header,
            buttons: buttons,
            inputs: opts.inputs ?? [],
        };

        const alert = await this.Controller.create(opt);
        await alert.present();
        const { data, role } = await alert.onWillDismiss();
        if (role == "confirm") {
            return data?.values?.length > 0 ? data.values : true;
        }
        else {
            return false;
        }
    }

    public async YesNo(opts: {
        message: string,
        header?: string,
        button_no?: AlertButton | string,
        button_yes?: AlertButton | string,
        button_yes_alternative?: AlertButton | string,
        inputs?: AlertInput[],
        translate?: boolean,
    }): Promise<any> {
        if (opts.translate) {
            opts.button_yes ??= "yes";
            opts.button_no ??= "no";
        }
        else {
            opts.button_yes ??= this.Locale.getText("yes");
            opts.button_no ??= this.Locale.getText("no");
        }

        const args = {
            message: opts.message,
            header: opts.header,
            buttons: [Alert.createButton(opts.button_no!, "cancel"), Alert.createButton(opts.button_yes!, "confirm")],
            translate: opts.translate,
            inputs: opts.inputs,
        };
        if (opts.button_yes_alternative) {
            args.buttons.push(Alert.createButton(opts.button_yes_alternative, "confirm"));
        }

        return this.Show(args);
    }

    private static createButton(btn: string | AlertButton, role: "cancel" | "confirm", handler?: () => Promise<void>): AlertButton {
        let ret: AlertButton;
        if (typeof btn === "string") {
            ret = { text: btn };
        } else {
            ret = btn;
        }
        ret.role = role;
        if (handler) {
            ret.handler = handler;
        }
        return ret;
    }
}

import { inject, Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { Preferences } from "@capacitor/preferences";
import { EPrefProperty } from "../storage/preferences.service";

@Injectable({
    providedIn: "root",
})
export class FirstStartGuard implements CanActivate {
    private _router = inject(Router);
    private _firststart?: boolean = true;

    public async canActivate(): Promise<boolean> {
        if (this._firststart === undefined) {
            const first_start = await Preferences.get({ key: EPrefProperty.FirstStart });
            if (first_start.value === undefined) {
                this._firststart = true;
            } else {
                this._firststart = false;
            }
        }
        if (this._firststart) {
            this._router.navigateByUrl("/first-start");
            this._firststart = false;
            return false;
        } else {
            return true;
        }
    }
}

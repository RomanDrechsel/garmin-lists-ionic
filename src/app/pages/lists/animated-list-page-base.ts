import { Subscription } from "rxjs";
import { CreateListitemAnimation, ListitemAnimationDirection } from "../../animations/create-listitem.animation";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { PageBase } from "../page-base";

export abstract class AnimatedListPageBase extends PageBase {
    private readonly animateItemsTimeout = 20;

    protected _initAnimationDone = false;
    protected _animationDirection: ListitemAnimationDirection = "top";

    private _animateItems = true;

    private _animationSubscription?: Subscription;

    public get InitialAnimationDone(): boolean {
        return this._initAnimationDone;
    }

    public override async ionViewWillEnter() {
        await super.ionViewWillEnter();
        this._animateItems = await this.Preferences.Get(EPrefProperty.Animations, true);
        if (this._animateItems == false) {
            this._initAnimationDone = true;
        }

        this._animationSubscription = this.Preferences.onPrefChanged$.subscribe(prop => {
            if (prop.prop == EPrefProperty.Animations) {
                this._animateItems = prop.value;
            }
        });
    }

    public override async ionViewWillLeave() {
        await super.ionViewWillLeave();
        if (this._animationSubscription) {
            this._animationSubscription.unsubscribe();
            this._animationSubscription = undefined;
        }
    }

    protected animateNewItems() {
        this.reload();
        if (this._animateItems) {
            const querySelector = "#animated-list .animated-item:not(.animation-running):not(.visible)";
            const unanimated = document.querySelectorAll(querySelector);
            if (unanimated.length > 0) {
                if (this.animateElement(unanimated[0] as HTMLElement)) {
                    const animation = CreateListitemAnimation(unanimated[0] as HTMLElement, this._animationDirection);
                    if (unanimated.length == 1) {
                        animation.afterAddRead(() => {
                            const unanimated = document.querySelector(querySelector);
                            if (!unanimated) {
                                this._initAnimationDone = true;
                                this.reload();
                            }
                        });
                    }
                    animation.play();

                    if (unanimated.length != 1) {
                        window.setTimeout(() => this.animateNewItems(), this.animateItemsTimeout);
                    }
                    return;
                } else {
                    unanimated.forEach(el => {
                        el.classList.add("visible");
                    });
                    this._initAnimationDone = true;
                }
            }
        }
    }

    private animateElement(el: HTMLElement): boolean {
        return el.offsetTop < window.scrollY + window.innerHeight;
    }
}

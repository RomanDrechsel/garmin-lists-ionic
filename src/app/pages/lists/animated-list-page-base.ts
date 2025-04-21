import { Subscription } from "rxjs";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { ListPageBase } from "./list-page-base";

export abstract class AnimatedListPageBase extends ListPageBase {
    private readonly _animationDelay = 30;

    protected _initAnimationDone = false;
    protected _animationDirection: "left" | "right" | "top" | "bottom" = "left";

    private _animateItems = true;
    private _resetAnimationTimeout?: number;

    private _animationSubscription?: Subscription;

    public get InitialAnimationDone(): boolean {
        return this._initAnimationDone;
    }

    public get ItemAnimationClass(): string {
        return `animation-${this._animationDirection}`;
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

    protected async onItemsChanged() {
        this.reload();
        if (!this._initAnimationDone && this._animateItems) {
            await new Promise<void>(resolve => setTimeout(() => resolve(), 10));
            const querySelector = "#animated-list .animated-item.animated:not(.animation-running)";
            const toanimated = Array.from(document.querySelectorAll(querySelector)).filter((el: Element) => this.animateElement(el as HTMLElement));
            console.log(`Animate ${toanimated.length} items`);

            toanimated.forEach((el: Element, index: number) => {
                const html_el = el as HTMLElement;
                if (html_el) {
                    console.log(el.classList);
                    html_el.style.transitionDelay = `${index * this._animationDelay}ms`;
                    if (index == toanimated.length - 1) {
                        console.log("Add Event Listener");
                        html_el.addEventListener("transitionend", this.animationDone(), { once: true });
                        html_el.addEventListener("transitioncancel", this.animationDone(), { once: true });
                    }
                    html_el.classList.add("animation-running");
                } else {
                    console.log("Animate element is not an HTMLElement");
                }
            });
            if (toanimated.length == 0) {
                this._initAnimationDone = true;
            } else {
                /*const transition_length = 600;
                this._resetAnimationTimeout = window.setTimeout(() => {
                    this.animationDone();
                }, transition_length + toanimated.length * this._animationDelay);*/
            }
        } else {
            this._initAnimationDone = true;
        }
    }

    private animateElement(el?: HTMLElement): boolean {
        if (!el) {
            return false;
        }
        return el.offsetTop < window.scrollY + window.innerHeight;
    }

    private animationDone(): () => void {
        return () => {
            this._initAnimationDone = true;
            console.log("Initial animation done");
            Array.from(document.querySelectorAll("#animated-list .animated-item")).forEach(el => {
                if (el instanceof HTMLElement) {
                    el.style.transitionDelay = "";
                    el.classList.remove("animated", "animation-running", this.ItemAnimationClass);
                    console.log(this.ItemAnimationClass, el.classList);
                }
            });
            if (this._resetAnimationTimeout) {
                window.clearTimeout(this._resetAnimationTimeout);
                this._resetAnimationTimeout = undefined;
            }
            this.reload();
        };
    }
}

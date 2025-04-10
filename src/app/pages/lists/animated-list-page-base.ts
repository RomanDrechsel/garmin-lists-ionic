import { Subscription } from "rxjs";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { PageBase } from "../page-base";

export abstract class AnimatedListPageBase extends PageBase {
    private readonly _animationDelay = 30;

    protected _initAnimationDone = false;
    protected _animationDirection: "left" | "right" | "top" | "bottom" = "left";

    private _animateItems = true;

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

        await new Promise<void>(resolve => setTimeout(() => resolve(), 10));

        if (!this._initAnimationDone && this._animateItems) {
            const querySelector = "#animated-list .animated-item.animated:not(.animation-running)";
            const toanimated = Array.from(document.querySelectorAll(querySelector)).filter((el: Element) => this.animateElement(el as HTMLElement));

            console.log(`found ${toanimated.length} items to animate`);

            toanimated.forEach((el: Element, index: number) => {
                const html_el = el as HTMLElement;
                if (html_el) {
                    html_el.style.transitionDelay = `${index * this._animationDelay}ms`;
                    if (index == toanimated.length - 1) {
                        html_el.addEventListener(
                            "transitionend",
                            (ev: TransitionEvent) => {
                                this._initAnimationDone = true;
                                Array.from(document.querySelectorAll("#animated-list .animated-item")).forEach(el => {
                                    if (el instanceof HTMLElement) {
                                        //el.classList.remove("animated", "animation-running", this.ItemAnimationClass);
                                        el.style.transitionDelay = "";
                                    }
                                });
                            },
                            { once: true },
                        );
                    }
                    html_el.classList.add("animation-running");
                } else {
                    console.log("no html element", el);
                }
            });
            if (toanimated.length == 0) {
                console.log("no items to animate");
                this._initAnimationDone = true;
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

    protected abstract getItemCount(): number;
}

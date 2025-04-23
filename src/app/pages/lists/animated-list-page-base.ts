import { Subscription } from "rxjs";
import { CreateListitemAnimation, type ListitemAnimationDirection } from "src/app/animations/listitem.animation";
import { EPrefProperty } from "../../services/storage/preferences.service";
import { ListPageBase } from "./list-page-base";

export abstract class AnimatedListPageBase extends ListPageBase {
    protected _initAnimationDone = false;
    protected _animationDirection: ListitemAnimationDirection = "left";

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

    protected async onItemsChanged() {
        this.reload();
        if (!this._initAnimationDone && this._animateItems) {
            await new Promise<void>(resolve => setTimeout(() => resolve(), 10));
            const querySelector = "#animated-list .animated-item:not(.animating)";
            const toanimated = Array.from(document.querySelectorAll(querySelector));
            console.log(`Animate ${toanimated.length} items`);

            toanimated.forEach((el: Element, index: number) => {
                if (this.animateElement(el as HTMLElement)) {
                    const animation = CreateListitemAnimation(el as HTMLElement, this._animationDirection, index);
                    if (index == toanimated.length - 1) {
                        animation.afterAddRead(() => {
                            console.log("Animation done");
                            this._initAnimationDone = true;
                        });
                    }
                    animation.play();
                } else {
                    el.classList.remove("pre-animation-state");
                    console.log("Not animating");
                }
            });
            if (toanimated.length == 0) {
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
}

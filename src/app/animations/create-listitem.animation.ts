import { Animation, AnimationController } from "@ionic/angular/standalone";

export const CreateListitemAnimation = (baseEl: HTMLElement, direction?: ListitemAnimationDirection): Animation => {
    const animationCtrl = new AnimationController();
    const duration = 400;

    try {
        const fade = animationCtrl
            .create()
            .addElement(baseEl)
            .delay(duration * 0.5)
            .duration(duration * 0.5)
            .easing("ease-out")
            .iterations(1)
            .fromTo("opacity", "0", "1");

        let from, to;
        switch (direction) {
            case "left":
                from = "translateX(-100%)";
                to = "translateX(0)";
                break;
            case "right":
                from = "translateX(100%)";
                to = "translateX(0)";
                break;
            case "bottom":
            default:
                from = `translateY(${window.innerHeight * 0.8}px)`;
                to = "translateY(0)";
                break;
            case "top":
                from = `translateY(${window.innerHeight * -0.8}px)`;
                to = "translateY(0)";
                break;
        }

        const swipe = animationCtrl.create().addElement(baseEl).duration(duration).iterations(1).easing("ease-out").fromTo("transform", from, to).beforeAddClass("animation-running").afterRemoveClass("animation-running").afterAddClass("visible");

        return animationCtrl.create().addAnimation([swipe, fade]);
    } catch (error) {
        return animationCtrl.create();
    }
};

export type ListitemAnimationDirection = "left" | "bottom" | "right" | "top";

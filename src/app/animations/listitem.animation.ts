import { Animation, AnimationController } from "@ionic/angular/standalone";

export const CreateListitemAnimation = (baseEl?: HTMLElement, direction: ListitemAnimationDirection = "top", index: number = 0): Animation => {
    const animationCtrl = new AnimationController();
    const duration = 600;
    const delay = 80;

    if (!baseEl) {
        return animationCtrl.create();
    }

    let from, to;
    switch (direction) {
        default:
        case "top":
            from = "translateY(-100vh)";
            to = "translateY(0)";
            break;
        case "bottom":
            from = "translateY(100vh)";
            to = "translateY(0)";
            break;
        case "left":
            from = "translateX(-100vw)";
            to = "translateX(0)";
            break;
        case "right":
            from = "translateX(100vw)";
            to = "translateX(0)";
            break;
    }

    const slide = animationCtrl.create().addElement(baseEl).duration(duration).easing("ease-in-out").iterations(1).fromTo("transform", from, to);
    const fade = animationCtrl
        .create()
        .addElement(baseEl)
        .duration(duration / 2)
        .delay(duration / 2)
        .easing("ease-in-out")
        .iterations(1)
        .fromTo("opacity", 0, 1);

    return animationCtrl
        .create()
        .addAnimation([slide, fade])
        .beforeAddClass("animating")
        .afterRemoveClass(["animating", "pre-animation-state"])
        .afterClearStyles(["transform", "opacity", "z-index"])
        .beforeStyles({ "z-index": index })
        .delay(index * delay);
};

export type ListitemAnimationDirection = "top" | "bottom" | "left" | "right";

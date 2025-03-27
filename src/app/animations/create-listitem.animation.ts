import { Animation, AnimationController } from "@ionic/angular/standalone";

export const CreateListitemAnimation = (baseEl: HTMLElement): Animation => {
    const animationCtrl = new AnimationController();
    const duration = 1000;
    const height = window.innerHeight;

    try {
        const fade = animationCtrl
            .create()
            .addElement(baseEl)
            .delay(duration * 0.6)
            .duration(duration * 0.7)
            .iterations(1)
            .fromTo("opacity", "0", "1");

        const swipe = animationCtrl
            .create()
            .addElement(baseEl)
            .duration(duration)
            .iterations(1)
            .fromTo("transform", `translateY(${height * 0.8}px)`, "translateY(0)")
            .beforeAddClass("animation-started")
            .afterRemoveClass("animation-started")
            .afterAddClass(["animation-done", "visible"]);

        return animationCtrl.create().addAnimation([swipe, fade]);
    } catch (error) {
        return animationCtrl.create();
    }
};

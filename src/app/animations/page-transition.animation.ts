import { Animation, AnimationController } from "@ionic/angular/standalone";

export const PageTransitionAnimation = (baseEl: HTMLElement, opts?: any): Animation => {
    const animationCtrl = new AnimationController();
    const duration = 270;

    try {
        if (opts.direction == "forward") {
            const forwardAnimation = animationCtrl.create()
                .addElement(opts.enteringEl)
                .duration(duration * 0.8)
                .iterations(1)
                .fromTo('opacity', 0.5, 1);

            const forward2Animation = animationCtrl.create()
                .addElement(opts.enteringEl)
                .duration(duration)
                .iterations(1)
                .fromTo('transform', 'translateX(100%)', 'translateX(0)');

            const leavingAnimation = animationCtrl.create()
                .addElement(opts.leavingEl)
                .duration(duration)
                .iterations(1)
                .fromTo('transform', 'translateX(0)', 'translateX(-100%)');

            return animationCtrl.create().addAnimation([forwardAnimation, forward2Animation, leavingAnimation]);
        }
        else {
            const backwardsAnimation = animationCtrl.create()
                .addElement(opts.enteringEl)
                .duration(duration * 0.8)
                .iterations(1)
                .fromTo('opacity', 0.5, 1);

            const backwards2Animation = animationCtrl.create()
                .addElement(opts.enteringEl)
                .duration(duration)
                .iterations(1)
                .fromTo('transform', 'translateX(-100%)', 'translateX(0)');



            const leavingAnimation = animationCtrl.create()
                .addElement(opts.leavingEl)
                .duration(duration)
                .iterations(1)
                .fromTo('transform', 'translateX(0)', 'translateX(100%)')
                .fromTo('opacity', 1, 0);

            return animationCtrl.create().addAnimation([backwardsAnimation, backwards2Animation, leavingAnimation]);
        }
    }
    catch (error) {
        return animationCtrl.create();
    }
};

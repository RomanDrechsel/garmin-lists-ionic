import { provideHttpClient } from "@angular/common/http";
import { enableProdMode, inject, isDevMode, provideAppInitializer } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, RouteReuseStrategy } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { IonicRouteStrategy, provideIonicAngular } from "@ionic/angular/standalone";
import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";
import { PageTransitionAnimation } from "./app/animations/page-transition.animation";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { AppService } from "./app/services/app/app.service";
import { environment } from "./environments/environment";

if (environment.production) {
    enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular({
            navAnimation: PageTransitionAnimation,
            innerHTMLTemplatesEnabled: true,
            mode: "md",
        }),
        provideRouter(routes),
        provideServiceWorker("ngsw-worker.js", {
            enabled: !isDevMode(),
            registrationStrategy: "registerWhenStable:30000",
        }),
        provideHttpClient(),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: "/assets/i18n/",
                suffix: ".json",
            }),
            fallbackLang: "en",
            lang: undefined,
        }),
        provideAppInitializer(() => inject(AppService).InitializeApp()),
    ],
}).catch(err => console.log(err));

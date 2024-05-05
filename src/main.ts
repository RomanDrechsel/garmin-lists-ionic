import { HttpClient, HttpClientModule } from "@angular/common/http";
import { APP_INITIALIZER, enableProdMode, importProvidersFrom, isDevMode } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { RouteReuseStrategy, provideRouter } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";
import { Capacitor } from "@capacitor/core";
import { IonicRouteStrategy, provideIonicAngular, } from "@ionic/angular/standalone";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { PageTransitionAnimation } from "./app/animations/page-transition.animation";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";
import { AppService } from "./app/services/app/app.service";
import { environment } from "./environments/environment";

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http);
}

export function initializeFactory(init: AppService) {
    return () => init.InitializeApp();
}

if (environment.production) {
    enableProdMode();
}

if (Capacitor.getPlatform() === "web") {
    jeepSqlite(window);
    window.addEventListener('DOMContentLoaded', () => {
        const jeepEl = document.createElement("jeep-sqlite");
        document.body.appendChild(jeepEl);
    });
}

bootstrapApplication(AppComponent, {
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular({
            navAnimation: PageTransitionAnimation,
            innerHTMLTemplatesEnabled: true,
            mode: undefined,
        }),
        provideRouter(routes),
        provideServiceWorker("ngsw-worker.js", {
            enabled: !isDevMode(),
            registrationStrategy: "registerWhenStable:30000",
        }),
        importProvidersFrom([
            HttpClientModule,
            TranslateModule.forRoot({
                defaultLanguage: "en",
                loader: {
                    provide: TranslateLoader,
                    useFactory: HttpLoaderFactory,
                    deps: [HttpClient],
                },
            }),
        ]),
        {
            provide: APP_INITIALIZER,
            useFactory: initializeFactory,
            deps: [AppService],
            multi: true
        },
    ],
}).catch((err) => console.log(err));

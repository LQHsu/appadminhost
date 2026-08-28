import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Forma moderna (standalone) de habilitar HttpClient: un provider
    // funcional en vez del viejo HttpClientModule en un NgModule.
    provideHttpClient(),
  ]
};

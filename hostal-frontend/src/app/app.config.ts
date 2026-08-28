import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { apiKeyInterceptor } from './core/interceptors/api-key.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Forma moderna (standalone) de habilitar HttpClient: un provider
    // funcional en vez del viejo HttpClientModule en un NgModule.
    // withInterceptors agrega la clave de acceso a cada request.
    provideHttpClient(withInterceptors([apiKeyInterceptor])),
  ]
};

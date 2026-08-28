import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

// Agrega la clave compartida (`x-api-key`) a cada request hacia
// nuestro backend. Si el backend responde 401 (clave inválida o
// revocada), cierra la sesión local para que la pantalla de acceso
// vuelva a pedirla, en vez de dejar que todo siga fallando en silencio.
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!req.url.startsWith(API_URL)) {
    return next(req); // no tocar llamadas a otros orígenes, si algún día las hay
  }

  const clave = authService.claveActual();
  const reqConClave = clave ? req.clone({ setHeaders: { 'x-api-key': clave } }) : req;

  return next(reqConClave).pipe(
    catchError((err) => {
      if (err?.status === 401) {
        authService.invalidar();
      }
      return throwError(() => err);
    }),
  );
};

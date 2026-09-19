import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

// Segunda clave, separada de APP_KEY (ver api-key.guard.ts): protege
// específicamente el endpoint de editar historial, para que no
// cualquiera con acceso normal a la app pueda corregir montos/pagos ya
// registrados. Se pide en el propio modal de edición cada vez, nunca
// se guarda en el navegador (a diferencia de la clave de acceso).
//
// Sin EDIT_PASSWORD configurada (dev local) el guard deja pasar todo,
// mismo criterio que ApiKeyGuard.
//
// Lanza 403, NO 401: el interceptor del frontend (api-key.interceptor.ts)
// cierra la sesión de TODA la app ante cualquier 401 — una contraseña
// de edición incorrecta no debe desconectar a nadie.
@Injectable()
export class EditPasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const claveEsperada = process.env.EDIT_PASSWORD;
    if (!claveEsperada) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const clave = req.headers['x-edit-password'];

    if (clave !== claveEsperada) {
      throw new ForbiddenException('Clave de edición inválida o faltante');
    }
    return true;
  }
}

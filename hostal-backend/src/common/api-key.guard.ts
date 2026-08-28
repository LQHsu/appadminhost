import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

// Cierre de acceso simple: toda la API exige el header `x-api-key`
// con el valor de APP_KEY. No es "autenticación de usuarios" (no hay
// login, roles, ni sesiones) — es una llave compartida para que la
// API no quede abierta a cualquiera en internet que encuentre la URL.
//
// Sin APP_KEY configurada (tu máquina local, donde nadie más puede
// llegar a localhost:3000 de todos modos) el guard deja pasar todo,
// para no romper el flujo de desarrollo de siempre. En producción
// (Render) SIEMPRE debe estar configurada — ver el warning en main.ts.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const claveEsperada = process.env.APP_KEY;
    if (!claveEsperada) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const clave = req.headers['x-api-key'];

    if (clave !== claveEsperada) {
      throw new UnauthorizedException('Clave de acceso inválida o faltante');
    }
    return true;
  }
}

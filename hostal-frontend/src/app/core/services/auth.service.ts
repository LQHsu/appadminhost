import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL, REQUIERE_CLAVE } from '../config/api.config';

const STORAGE_KEY = 'hostal_api_key';

// Cierre de acceso simple: NO es un login de usuarios (no hay roles,
// ni sesiones por persona) — es una clave compartida que el equipo
// del hostal escribe una vez y el navegador recuerda (localStorage).
// El backend la exige en cada request vía el header `x-api-key` (ver
// api-key.guard.ts del backend); sin ella, la API queda pública para
// cualquiera con la URL.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private claveGuardada = signal<string | null>(this.leerClaveGuardada());

  // Si REQUIERE_CLAVE es false (desarrollo local), siempre "desbloqueado".
  desbloqueado = computed(() => !REQUIERE_CLAVE || this.claveGuardada() !== null);

  error = signal('');
  verificando = signal(false);

  private leerClaveGuardada(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null; // localStorage puede fallar (modo privado, storage bloqueado, etc.)
    }
  }

  claveActual(): string | null {
    return this.claveGuardada();
  }

  // Llamada liviana solo para validar la clave ANTES de "entrar" — si
  // no, el usuario vería la app completa y todo le fallaría con 401
  // sin ninguna explicación.
  async intentarClave(clave: string) {
    this.verificando.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.http.get(`${API_URL}/habitaciones`, { headers: { 'x-api-key': clave } }));
      try {
        localStorage.setItem(STORAGE_KEY, clave);
      } catch {
        // si no se puede persistir, igual la dejamos en memoria para
        // esta sesión — mejor que bloquear al usuario por completo.
      }
      this.claveGuardada.set(clave);
    } catch {
      this.error.set('Clave incorrecta. Intenta de nuevo.');
    } finally {
      this.verificando.set(false);
    }
  }

  cerrarSesion() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
    this.claveGuardada.set(null);
  }

  // Usado por el interceptor: si el backend responde 401 (clave
  // revocada/cambiada a mano en Render), cerramos sesión local para
  // que se vuelva a pedir en vez de seguir fallando en silencio.
  invalidar() {
    this.cerrarSesion();
  }
}

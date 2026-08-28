import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { CreateRegistroDto, Registro, Renovar } from '../models/registro.model';

@Injectable({ providedIn: 'root' })
export class RegistrosService {
  private http = inject(HttpClient);

  registros = signal<Registro[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  cargarRegistros() {
    this.cargando.set(true);
    this.http.get<Registro[]>(`${API_URL}/registros`).subscribe({
      next: (data) => {
        this.registros.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  // Devuelve el Observable para que el componente maneje éxito/error
  // puntual del formulario (mensajes, limpiar campos, etc.), y de
  // paso refresca la lista en cuanto se confirma la creación.
  crearRegistro(dto: CreateRegistroDto) {
    this.error.set(null);
    return this.http.post<Registro>(`${API_URL}/registros`, dto);
  }

  // diasRenovacion solo aplica cuando renovar === 'SI'; el backend lo
  // ignora para 'NO'.
  actualizarRenovar(id: number, renovar: Renovar, diasRenovacion?: number) {
    return this.http.patch<Registro>(`${API_URL}/registros/${id}/renovar`, {
      renovar,
      diasRenovacion,
    });
  }

  // otroCobroCheckout: cargo extra decidido al salir (ej. daños/consumo).
  // multaTardio: multa manual por checkout después de las 12 pm.
  // Ambos opcionales, se capturan a mano en el modal de confirmación.
  checkout(id: number, otroCobroCheckout?: number, multaTardio?: number) {
    return this.http.post(`${API_URL}/registros/${id}/checkout`, {
      otroCobroCheckout,
      multaTardio,
    });
  }
}

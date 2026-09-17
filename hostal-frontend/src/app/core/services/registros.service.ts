import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { CreateRegistroDto, PagoDto, Registro, Renovar } from '../models/registro.model';

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
  // ignora para 'NO'. pagos: cómo se pagó la renovación (solo aplica
  // cuando renovar === 'SI').
  actualizarRenovar(id: number, renovar: Renovar, diasRenovacion?: number, pagos?: PagoDto[]) {
    return this.http.patch<Registro>(`${API_URL}/registros/${id}/renovar`, {
      renovar,
      diasRenovacion,
      pagos,
    });
  }

  // cobrosExtra: uno o varios cargos extra decididos al salir (ej.
  // minibar, daños). multaTardio/multaTardioMetodoPago: multa manual
  // por checkout después de las 12 pm. Todo opcional.
  checkout(id: number, cobrosExtra?: PagoDto[], multaTardio?: number, multaTardioMetodoPago?: string) {
    return this.http.post(`${API_URL}/registros/${id}/checkout`, {
      cobrosExtra,
      multaTardio,
      multaTardioMetodoPago,
    });
  }

  // Cobro extra a mitad de estadía (minibar, daños, etc.) sin que el
  // huésped tenga que hacer checkout todavía.
  cobroExtra(id: number, cobros: PagoDto[]) {
    return this.http.post<Registro>(`${API_URL}/registros/${id}/cobro-extra`, { cobros });
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { CreateHabitacionDto, Disponibilidad, Habitacion } from '../models/habitacion.model';

@Injectable({ providedIn: 'root' })
export class HabitacionesService {
  // inject() es la forma moderna de pedir dependencias: equivale a
  // hacerlo por constructor, pero se puede usar en cualquier campo
  // de la clase, no solo ahí.
  private http = inject(HttpClient);

  // Estado como signals: en vez de un BehaviorSubject + subscribe(),
  // el signal se lee directamente en el template con habitaciones()
  // y Angular re-renderiza solo lo que depende de él.
  habitaciones = signal<Habitacion[]>([]);
  disponibilidad = signal<Disponibilidad[]>([]);
  cargando = signal(false);

  cargarHabitaciones() {
    this.cargando.set(true);
    this.http.get<Habitacion[]>(`${API_URL}/habitaciones`).subscribe({
      next: (data) => {
        this.habitaciones.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cargarDisponibilidad() {
    this.http
      .get<Disponibilidad[]>(`${API_URL}/habitaciones/disponibilidad`)
      .subscribe((data) => this.disponibilidad.set(data));
  }

  crearHabitacion(dto: CreateHabitacionDto) {
    return this.http.post<Habitacion>(`${API_URL}/habitaciones`, dto);
  }
}

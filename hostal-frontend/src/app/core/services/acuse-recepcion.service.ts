import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { AcuseRecepcion, CreateAcuseRecepcionDto } from '../models/acuse-recepcion.model';

@Injectable({ providedIn: 'root' })
export class AcuseRecepcionService {
  private http = inject(HttpClient);

  acuses = signal<AcuseRecepcion[]>([]);

  // desde/hasta: 'YYYY-MM-DD' — mismo rango que se está viendo en el
  // Reporte Diario.
  cargarAcuses(desde: string, hasta: string) {
    this.http
      .get<AcuseRecepcion[]>(`${API_URL}/acuses-recepcion`, { params: { desde, hasta } })
      .subscribe((data) => this.acuses.set(data));
  }

  crearAcuse(dto: CreateAcuseRecepcionDto) {
    return this.http.post<AcuseRecepcion>(`${API_URL}/acuses-recepcion`, dto);
  }
}

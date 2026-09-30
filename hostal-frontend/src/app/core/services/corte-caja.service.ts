import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { CorteCaja, CreateCorteCajaDto } from '../models/corte-caja.model';

@Injectable({ providedIn: 'root' })
export class CorteCajaService {
  private http = inject(HttpClient);

  cortes = signal<CorteCaja[]>([]);

  // desde/hasta: 'YYYY-MM-DD' — mismo rango que se está viendo en el
  // Reporte Diario, para saber si ya se hizo un corte para ese día.
  cargarCortes(desde: string, hasta: string) {
    this.http
      .get<CorteCaja[]>(`${API_URL}/cortes-caja`, { params: { desde, hasta } })
      .subscribe((data) => this.cortes.set(data));
  }

  crearCorte(dto: CreateCorteCajaDto) {
    return this.http.post<CorteCaja>(`${API_URL}/cortes-caja`, dto);
  }
}

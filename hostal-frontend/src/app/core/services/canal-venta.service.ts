import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { CanalVenta, CreateCanalVentaDto, UpdateCanalVentaDto } from '../models/canal-venta.model';

@Injectable({ providedIn: 'root' })
export class CanalVentaService {
  private http = inject(HttpClient);

  canales = signal<CanalVenta[]>([]);

  cargarCanales() {
    this.http.get<CanalVenta[]>(`${API_URL}/canales-venta`).subscribe((data) => this.canales.set(data));
  }

  crearCanal(dto: CreateCanalVentaDto) {
    return this.http.post<CanalVenta>(`${API_URL}/canales-venta`, dto);
  }

  actualizarCanal(id: number, dto: UpdateCanalVentaDto) {
    return this.http.patch<CanalVenta>(`${API_URL}/canales-venta/${id}`, dto);
  }
}

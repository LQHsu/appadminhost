import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Historial, ReporteAnual, ReporteRango, ReporteMensual, UpdateHistorialDto } from '../models/historial.model';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private http = inject(HttpClient);

  historial = signal<Historial[]>([]);
  reporte = signal<ReporteMensual | null>(null);
  reporteAnual = signal<ReporteAnual | null>(null);
  reporteDiario = signal<ReporteRango | null>(null);

  cargarHistorial() {
    this.http.get<Historial[]>(`${API_URL}/historial`).subscribe((data) => this.historial.set(data));
  }

  cargarReporteMensual(anio: number, mes: number) {
    this.http
      .get<ReporteMensual>(`${API_URL}/historial/reporte-mensual`, { params: { anio, mes } })
      .subscribe((data) => this.reporte.set(data));
  }

  cargarReporteAnual(anio: number) {
    this.http
      .get<ReporteAnual>(`${API_URL}/historial/reporte-anual`, { params: { anio } })
      .subscribe((data) => this.reporteAnual.set(data));
  }

  // desde/hasta: 'YYYY-MM-DD'. Un solo día es un rango donde
  // desde === hasta.
  cargarReporteDiario(desde: string, hasta: string) {
    this.http
      .get<ReporteRango>(`${API_URL}/historial/reporte-diario`, { params: { desde, hasta } })
      .subscribe((data) => this.reporteDiario.set(data));
  }

  // Corrige una fila ya guardada. claveEdicion va en un header aparte
  // de x-api-key (ver edit-password.guard.ts en el backend) — no se
  // guarda en ningún lado, se manda tal cual se escribió en el modal.
  actualizarIngreso(id: number, dto: UpdateHistorialDto, claveEdicion: string) {
    return this.http.patch<Historial>(`${API_URL}/historial/${id}`, dto, {
      headers: { 'x-edit-password': claveEdicion },
    });
  }

  // Borra solo esta fila — el backend rechaza si no es el evento más
  // reciente de su estadía.
  eliminarEvento(id: number, claveEdicion: string) {
    return this.http.delete<{ eliminado: boolean; registroEliminado: boolean }>(
      `${API_URL}/historial/${id}`,
      { headers: { 'x-edit-password': claveEdicion } },
    );
  }

  // Borra TODA la estadía a la que pertenece esta fila, sin importar
  // cuántos eventos tenga.
  eliminarEstadia(id: number, claveEdicion: string) {
    return this.http.delete<{ eliminado: boolean; registroOriginalId: number }>(
      `${API_URL}/historial/${id}/estadia`,
      { headers: { 'x-edit-password': claveEdicion } },
    );
  }
}

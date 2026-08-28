import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { Historial, ReporteAnual, ReporteRango, ReporteMensual } from '../models/historial.model';

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
}

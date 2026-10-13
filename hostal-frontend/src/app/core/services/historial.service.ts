import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import {
  Historial,
  ReporteAnual,
  ReporteRango,
  ReporteMensual,
  UpdateHistorialDto,
  TipoEvento,
} from '../models/historial.model';
import { MetodoPago } from '../models/registro.model';

interface PaginaHistorial {
  data: Historial[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private http = inject(HttpClient);

  readonly historialLimit = 20;

  historial = signal<Historial[]>([]);
  historialTotal = signal(0);
  historialPage = signal(1);
  historialTotalPaginas = computed(() => Math.max(1, Math.ceil(this.historialTotal() / this.historialLimit)));

  // Filtros del listado — viven aquí (no en el componente) por el
  // mismo motivo que historialPage: así "cargarHistorial()" sin
  // argumentos, llamado después de editar/eliminar una fila, los
  // vuelve a aplicar solo en vez de perderlos.
  historialFiltroMetodoPago = signal<MetodoPago | ''>('');
  historialFiltroTipo = signal<TipoEvento | ''>('');
  historialFiltroCliente = signal('');

  reporte = signal<ReporteMensual | null>(null);
  reporteAnual = signal<ReporteAnual | null>(null);
  reporteDiario = signal<ReporteRango | null>(null);

  // Sin argumento, recarga la página actual (ej. después de editar o
  // eliminar una fila, para no perder el lugar en el que se estaba) —
  // los filtros se aplican ANTES de paginar en el backend, así la
  // página 1 filtrada no deja fuera resultados de páginas no filtradas.
  cargarHistorial(page = this.historialPage()) {
    const params: Record<string, string | number> = { page, limit: this.historialLimit };
    if (this.historialFiltroMetodoPago()) params['metodoPago'] = this.historialFiltroMetodoPago();
    if (this.historialFiltroTipo()) params['tipo'] = this.historialFiltroTipo();
    if (this.historialFiltroCliente()) params['cliente'] = this.historialFiltroCliente();

    this.http.get<PaginaHistorial>(`${API_URL}/historial`, { params }).subscribe((res) => {
      this.historial.set(res.data);
      this.historialTotal.set(res.total);
      this.historialPage.set(res.page);
    });
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

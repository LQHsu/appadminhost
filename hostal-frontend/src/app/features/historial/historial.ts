import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';
import { TipoEvento } from '../../core/models/historial.model';
import { ReporteAnual } from '../reporte-anual/reporte-anual';
import { ReporteDiario } from '../reporte-diario/reporte-diario';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, DecimalPipe, FormsModule, ReporteAnual, ReporteDiario],
  templateUrl: './historial.html',
})
export class HistorialComponent implements OnInit {
  historialService = inject(HistorialService);

  hoy = new Date();
  anio = signal(this.hoy.getFullYear());
  mes = signal(this.hoy.getMonth() + 1); // getMonth() es 0-indexado

  ngOnInit() {
    this.historialService.cargarHistorial();
    this.consultarReporte();
  }

  consultarReporte() {
    this.historialService.cargarReporteMensual(this.anio(), this.mes());
  }

  etiquetaTipo(tipo: TipoEvento): string {
    switch (tipo) {
      case 'CHECK_IN':
        return 'Check-in';
      case 'RENOVACION':
        return 'Renovación';
      case 'CHECKOUT':
        return 'Checkout';
    }
  }

  claseTipo(tipo: TipoEvento): string {
    switch (tipo) {
      case 'CHECK_IN':
        return 'bg-sky-100 text-sky-700';
      case 'RENOVACION':
        return 'bg-emerald-100 text-emerald-700';
      case 'CHECKOUT':
        return 'bg-slate-100 text-slate-600';
    }
  }

  // Solo para las tarjetas del reporte mensual (números "redondos" para
  // presentar). El total exacto sigue viviendo intacto en todos lados
  // donde importa cuadrar caja (corte de caja del reporte diario,
  // "Historial de ingresos", etc.) — esto NO toca esos datos.
  redondearArriba3CifrasSig(n: number): number {
    if (n === 0) return 0;
    const signo = n < 0 ? -1 : 1;
    const abs = Math.abs(n);
    const magnitud = Math.floor(Math.log10(abs)) + 1;
    const factor = Math.pow(10, Math.max(0, magnitud - 3));
    return signo * Math.ceil(abs / factor) * factor;
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';
import { TipoEvento } from '../../core/models/historial.model';
import { ReporteAnual } from '../reporte-anual/reporte-anual';
import { ReporteDiario } from '../reporte-diario/reporte-diario';

@Component({
  selector: 'app-historial',
  imports: [DatePipe, FormsModule, ReporteAnual, ReporteDiario],
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
}

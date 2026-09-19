import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';
import { Historial, TipoEvento } from '../../core/models/historial.model';
import { ReporteAnual } from '../reporte-anual/reporte-anual';
import { ReporteDiario } from '../reporte-diario/reporte-diario';

@Component({
  selector: 'app-historial',
  imports: [CurrencyPipe, DatePipe, FormsModule, ReporteAnual, ReporteDiario],
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
      case 'COBRO_EXTRA':
        return 'Cobro extra';
      case 'CHECKOUT':
        return 'Checkout';
    }
  }

  // Desglosa los pagos de una fila en líneas "MÉTODO: $monto" — cuando
  // hubo un solo método (el caso normal) queda igual que antes, pero
  // si se pagó con varios (ej. mitad efectivo mitad tarjeta) los
  // muestra todos en vez de solo el primero. `pagos` viene vacío en
  // datos viejos (de antes de que existiera Ingreso); ahí cae de
  // regreso a `metodoPago`.
  desglosePagos(h: Historial): string[] {
    if (h.pagos && h.pagos.length > 0) {
      return h.pagos.map((p) => `${p.metodoPago}: $${p.cantidad}`);
    }
    return [h.metodoPago];
  }

  claseTipo(tipo: TipoEvento): string {
    switch (tipo) {
      case 'CHECK_IN':
        return 'bg-sky-100 text-sky-700';
      case 'RENOVACION':
        return 'bg-emerald-100 text-emerald-700';
      case 'COBRO_EXTRA':
        return 'bg-amber-100 text-amber-700';
      case 'CHECKOUT':
        return 'bg-slate-100 text-slate-600';
    }
  }
}

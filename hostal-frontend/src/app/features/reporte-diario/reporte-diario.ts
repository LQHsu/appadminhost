import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';
import { TipoEvento } from '../../core/models/historial.model';

function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// Antes era "reporte por mes con una fila por día"; ahora es un
// reporte por RANGO de fechas (un solo día es un rango donde
// desde === hasta), con el detalle línea por línea del historial
// (para el corte de caja) en vez de un resumen agregado por día.
@Component({
  selector: 'app-reporte-diario',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './reporte-diario.html',
})
export class ReporteDiario implements OnInit {
  historialService = inject(HistorialService);

  desde = signal(hoyIso());
  hasta = signal(hoyIso());

  // Datos del corte de caja: se capturan a mano para armar el PDF de
  // esta consulta puntual — no se guardan en el backend.
  entregadoA = signal('');
  cantidadEntregada = signal<number | null>(null);
  entregadoPor = signal('');
  comentarios = signal('');

  ngOnInit() {
    this.consultar();
  }

  consultar() {
    this.historialService.cargarReporteDiario(this.desde(), this.hasta());
  }

  rangoTexto = computed(() => {
    const d = this.desde();
    const h = this.hasta();
    return d === h
      ? this.formatearFecha(d)
      : `Del ${this.formatearFecha(d)} al ${this.formatearFecha(h)}`;
  });

  private formatearFecha(iso: string): string {
    const [anio, mes, dia] = iso.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  // "Exportar a PDF" = imprimir solo esta sección (ver .reporte-diario-print
  // en styles.css) y dejar que el usuario elija "Guardar como PDF" en el
  // diálogo de impresión del navegador — sin depender de ninguna librería.
  imprimir() {
    const tituloOriginal = document.title;
    document.title = `Corte de caja ${this.desde()} a ${this.hasta()}`;
    window.print();
    document.title = tituloOriginal;
  }
}

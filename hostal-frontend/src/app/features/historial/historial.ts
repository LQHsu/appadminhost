import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistorialService } from '../../core/services/historial.service';
import { Historial, TipoEvento } from '../../core/models/historial.model';
import { ReporteAnual } from '../reporte-anual/reporte-anual';
import { ReporteDiario } from '../reporte-diario/reporte-diario';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal/confirm-modal';
import { LoadingOverlay } from '../../shared/loading-overlay/loading-overlay';
import { LineasCobro, LineaCobro, resolverLineasCobro } from '../../shared/lineas-cobro/lineas-cobro';
import { aInputDatetimeLocal } from '../../shared/date-utils';

@Component({
  selector: 'app-historial',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ReporteAnual,
    ReporteDiario,
    ConfirmModal,
    LoadingOverlay,
    LineasCobro,
  ],
  templateUrl: './historial.html',
})
export class HistorialComponent implements OnInit {
  historialService = inject(HistorialService);

  hoy = new Date();
  anio = signal(this.hoy.getFullYear());
  mes = signal(this.hoy.getMonth() + 1); // getMonth() es 0-indexado

  // --- Edición de una fila ya guardada (corrección de monto/pago/
  // nombre/fecha, protegida con una clave aparte de la de acceso) ---

  edicionPendiente = signal<Historial | null>(null);
  nombreClienteEdit = signal('');
  fechaEventoEdit = signal('');
  totalCobradoEdit = signal(0);
  pagosEdit = signal<LineaCobro[]>([]);
  claveEdicion = signal('');
  errorEdicion = signal('');
  enviandoEdicion = signal(false);

  // --- Eliminar (solo el evento más reciente de una estadía, o la
  // estadía completa sin restricción) — misma clave de edición ---

  eliminacionPendiente = signal<{ h: Historial; modo: 'evento' | 'estadia' } | null>(null);
  claveEliminacion = signal('');
  errorEliminacion = signal('');
  enviandoEliminacion = signal(false);

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

  // Abre el modal de corrección precargado con los datos actuales de
  // la fila. `claveEdicion` se limpia siempre, nunca se recuerda de
  // una edición a otra.
  pedirEdicion(h: Historial) {
    this.nombreClienteEdit.set(h.nombreCliente);
    this.fechaEventoEdit.set(aInputDatetimeLocal(new Date(h.fechaEvento)));
    this.totalCobradoEdit.set(h.totalCobrado);
    this.pagosEdit.set(
      h.pagos && h.pagos.length > 0
        ? h.pagos.map((p) => ({ metodoPago: p.metodoPago, cantidad: p.cantidad, nota: p.nota ?? undefined }))
        : [{ metodoPago: h.metodoPago, cantidad: h.totalCobrado }],
    );
    this.claveEdicion.set('');
    this.errorEdicion.set('');
    this.edicionPendiente.set(h);
  }

  cancelarEdicion() {
    this.edicionPendiente.set(null);
    this.errorEdicion.set('');
  }

  confirmarEdicion() {
    const h = this.edicionPendiente();
    if (!h) return;

    const total = this.totalCobradoEdit();
    const pagos = resolverLineasCobro(this.pagosEdit(), total);
    const suma = pagos.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
    if (Math.abs(suma - total) > 0.01) {
      this.errorEdicion.set('Los pagos no suman el total corregido — revisa los montos.');
      return;
    }
    if (!this.claveEdicion()) {
      this.errorEdicion.set('Escribe la clave de edición.');
      return;
    }

    this.errorEdicion.set('');
    this.enviandoEdicion.set(true);
    this.historialService
      .actualizarIngreso(
        h.id,
        {
          nombreCliente: this.nombreClienteEdit(),
          fechaEvento: new Date(this.fechaEventoEdit()).toISOString(),
          totalCobrado: total,
          pagos,
        },
        this.claveEdicion(),
      )
      .subscribe({
        next: () => {
          this.enviandoEdicion.set(false);
          this.edicionPendiente.set(null);
          this.historialService.cargarHistorial();
        },
        error: (err) => {
          this.enviandoEdicion.set(false);
          this.errorEdicion.set(err.error?.message ?? 'No se pudo guardar la corrección, intenta de nuevo');
        },
      });
  }

  // `true` si no existe otra fila con el mismo registroOriginalId y un
  // id mayor — mismo criterio que valida el backend en eliminar(). Solo
  // sirve para deshabilitar el botón como ayuda visual; la validación
  // real vive en el servidor.
  esUltimoEvento(h: Historial): boolean {
    return !this.historialService
      .historial()
      .some((otro) => otro.registroOriginalId === h.registroOriginalId && otro.id > h.id);
  }

  pedirEliminacion(h: Historial, modo: 'evento' | 'estadia') {
    this.claveEliminacion.set('');
    this.errorEliminacion.set('');
    this.eliminacionPendiente.set({ h, modo });
  }

  cancelarEliminacion() {
    this.eliminacionPendiente.set(null);
    this.errorEliminacion.set('');
  }

  confirmarEliminacion() {
    const pendiente = this.eliminacionPendiente();
    if (!pendiente) return;
    if (!this.claveEliminacion()) {
      this.errorEliminacion.set('Escribe la clave de edición.');
      return;
    }

    const alGuardar = {
      next: () => {
        this.enviandoEliminacion.set(false);
        this.eliminacionPendiente.set(null);
        this.historialService.cargarHistorial();
      },
      error: (err: { error?: { message?: string } }) => {
        this.enviandoEliminacion.set(false);
        this.errorEliminacion.set(err.error?.message ?? 'No se pudo eliminar, intenta de nuevo');
      },
    };

    this.errorEliminacion.set('');
    this.enviandoEliminacion.set(true);
    if (pendiente.modo === 'evento') {
      this.historialService.eliminarEvento(pendiente.h.id, this.claveEliminacion()).subscribe(alGuardar);
    } else {
      this.historialService.eliminarEstadia(pendiente.h.id, this.claveEliminacion()).subscribe(alGuardar);
    }
  }
}

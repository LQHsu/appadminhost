import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrosService } from '../../core/services/registros.service';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { Status, Registro } from '../../core/models/registro.model';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal/confirm-modal';
import { LoadingOverlay } from '../../shared/loading-overlay/loading-overlay';
import { LineasCobro, LineaCobro, resolverLineasCobro } from '../../shared/lineas-cobro/lineas-cobro';

type TipoAccion = 'checkout' | 'no-renovar' | 'renovar' | 'cobro-extra';

// Formatea un Date al formato que espera <input type="datetime-local">
// (YYYY-MM-DDTHH:mm, en hora LOCAL — a diferencia de toISOString() que
// da UTC y desfasaría la hora mostrada).
function aInputDatetimeLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

function ahoraInput(): string {
  return aInputDatetimeLocal(new Date());
}

@Component({
  selector: 'app-registros-list',
  imports: [DatePipe, CurrencyPipe, ConfirmModal, LoadingOverlay, LineasCobro, FormsModule],
  templateUrl: './registros-list.html',
})
export class RegistrosList implements OnInit {
  registrosService = inject(RegistrosService);
  private habitacionesService = inject(HabitacionesService);

  // null = no hay ningún modal abierto. Si tiene valor, sabemos
  // exactamente qué registro y qué acción está pendiente de confirmar.
  accionPendiente = signal<{ tipo: TipoAccion; registro: Registro } | null>(null);

  // Mientras el checkout/renovar está en camino al backend — bloquea
  // con el overlay para que no se pueda reenviar la misma acción dos
  // veces si el servidor tarda en responder (ver LoadingOverlay).
  enviando = signal(false);

  // Solo se usa cuando tipo === 'renovar': cuántos días quiere
  // renovar el huésped. Se precarga con las noches originales como
  // sugerencia, pero el usuario la puede cambiar en el modal.
  diasRenovacion = signal(1);

  // Cómo se paga la renovación — mismo componente que en el check-in.
  lineasRenovacion = signal<LineaCobro[]>([{ metodoPago: 'EFECTIVO', cantidad: 0 }]);

  // Solo se usan cuando tipo === 'checkout'. cobrosExtra es una lista
  // libre (minibar, daños, etc. — cada uno su propio monto/método/
  // nota); empieza vacía porque son opcionales. La multa es un solo
  // monto con su propio método.
  cobrosExtra = signal<LineaCobro[]>([]);
  multaTardio = signal(0);
  multaTardioMetodoPago = signal<'EFECTIVO' | 'TARJETA'>('EFECTIVO');

  // Fecha/hora real de salida — precargada con "ahora" (el caso
  // normal), pero editable para registrar tarde una salida que ya
  // pasó, o corregir una equivocada.
  checkOutReal = signal(ahoraInput());

  // Solo se usa cuando tipo === 'cobro-extra': igual que los cobros
  // extra del checkout, pero sin que el huésped tenga que salir. Lista
  // separada de la de checkout para no mezclar los dos flujos.
  cobrosExtraDirecto = signal<LineaCobro[]>([]);

  ngOnInit() {
    this.registrosService.cargarRegistros();
    this.habitacionesService.cargarDisponibilidad();
  }

  // Refresca ambos: la lista de registros y las camas disponibles,
  // porque cualquier acción aquí (renovar/checkout) afecta a los dos.
  private refrescar() {
    this.registrosService.cargarRegistros();
    this.habitacionesService.cargarDisponibilidad();
  }

  pedirConfirmacion(tipo: TipoAccion, registro: Registro) {
    if (tipo === 'renovar') {
      this.diasRenovacion.set(registro.noches); // sugerencia inicial
      this.lineasRenovacion.set([{ metodoPago: 'EFECTIVO', cantidad: 0 }]);
    }
    if (tipo === 'checkout') {
      this.cobrosExtra.set([]);
      this.multaTardio.set(0);
      this.multaTardioMetodoPago.set('EFECTIVO');
      this.checkOutReal.set(ahoraInput());
    }
    if (tipo === 'cobro-extra') {
      this.cobrosExtraDirecto.set([]);
    }
    this.accionPendiente.set({ tipo, registro });
  }

  // Monto de la renovación (para que las líneas de pago sepan a qué
  // total deben sumar) — mismo cálculo que hace el backend.
  montoRenovacionPreview(registro: Registro): number {
    return registro.camasSolicitadas * registro.costoPorCama * this.diasRenovacion();
  }

  cancelarAccion() {
    this.accionPendiente.set(null);
  }

  errorAccion = signal('');

  confirmarAccion() {
    const pendiente = this.accionPendiente();
    if (!pendiente) return;

    let accion$;
    switch (pendiente.tipo) {
      case 'checkout': {
        const checkOutRealIso = new Date(this.checkOutReal()).toISOString();
        accion$ = this.registrosService.checkout(
          pendiente.registro.id,
          this.cobrosExtra(),
          this.multaTardio(),
          this.multaTardioMetodoPago(),
          checkOutRealIso,
        );
        break;
      }
      case 'no-renovar':
        accion$ = this.registrosService.actualizarRenovar(pendiente.registro.id, 'NO');
        break;
      case 'renovar': {
        const total = this.montoRenovacionPreview(pendiente.registro);
        const pagos = resolverLineasCobro(this.lineasRenovacion(), total);
        const suma = pagos.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
        if (Math.abs(suma - total) > 0.01) {
          this.errorAccion.set('Los pagos no suman el total de la renovación — revisa los montos.');
          return;
        }
        accion$ = this.registrosService.actualizarRenovar(
          pendiente.registro.id,
          'SI',
          this.diasRenovacion(),
          pagos,
        );
        break;
      }
      case 'cobro-extra': {
        const cobros = this.cobrosExtraDirecto();
        if (cobros.length === 0 || cobros.some((c) => !(Number(c.cantidad) > 0))) {
          this.errorAccion.set('Agrega al menos un cobro con un monto mayor a $0.');
          return;
        }
        accion$ = this.registrosService.cobroExtra(pendiente.registro.id, cobros);
        break;
      }
    }

    this.errorAccion.set('');
    this.enviando.set(true);
    accion$.subscribe({
      next: () => {
        this.enviando.set(false);
        this.accionPendiente.set(null);
        this.refrescar();
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorAccion.set(err.error?.message ?? 'No se pudo completar la acción, intenta de nuevo');
      },
    });
  }

  tituloModal = computed(() => {
    const p = this.accionPendiente();
    if (!p) return '';
    switch (p.tipo) {
      case 'checkout':
        return 'Confirmar checkout';
      case 'no-renovar':
        return 'Confirmar "No renovar"';
      case 'renovar':
        return 'Renovar hospedaje';
      case 'cobro-extra':
        return 'Registrar cobro extra';
    }
  });

  claseStatus(status: Status): string {
    switch (status) {
      case 'VIGENTE':
        return 'bg-emerald-100 text-emerald-700';
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-700';
      case 'RENOVADO':
        return 'bg-sky-100 text-sky-700';
      case 'NO':
        return 'bg-red-100 text-red-700';
    }
  }

  // --- Indicadores del día (tarjetas arriba de la tabla) ---

  // Huéspedes con un registro abierto ahora mismo (el backend ya solo
  // nos manda los que tienen cerrado=false).
  inquilinosActivos = computed(() => this.registrosService.registros().length);

  // "Deben hacer checkout": ya pasó su hora estimada (12 pm) y siguen
  // sin salir — sin importar si están PENDIENTE o ya dijeron "NO
  // renovó"; decidir no renovar no es lo mismo que ya haberse ido.
  debenCheckout = computed(
    () => this.registrosService.registros().filter((r) => r.vencido).length,
  );

  // Habitaciones con al menos una cama libre.
  cuartosDisponibles = computed(
    () => this.habitacionesService.disponibilidad().filter((h) => h.camasDisponibles > 0).length,
  );

  totalCuartos = computed(() => this.habitacionesService.disponibilidad().length);

  // Suma de camas libres/totales en todo el hostal, para el cuadro
  // de indicadores de arriba.
  camasDisponibles = computed(() =>
    this.habitacionesService.disponibilidad().reduce((sum, h) => sum + h.camasDisponibles, 0),
  );

  camasTotales = computed(() =>
    this.habitacionesService.disponibilidad().reduce((sum, h) => sum + h.camasTotales, 0),
  );
}

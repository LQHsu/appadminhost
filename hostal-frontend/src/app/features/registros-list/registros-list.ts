import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RegistrosService } from '../../core/services/registros.service';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { Status, Registro } from '../../core/models/registro.model';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal/confirm-modal';

type TipoAccion = 'checkout' | 'no-renovar' | 'renovar';

@Component({
  selector: 'app-registros-list',
  imports: [DatePipe, ConfirmModal, FormsModule],
  templateUrl: './registros-list.html',
})
export class RegistrosList implements OnInit {
  registrosService = inject(RegistrosService);
  private habitacionesService = inject(HabitacionesService);

  // null = no hay ningún modal abierto. Si tiene valor, sabemos
  // exactamente qué registro y qué acción está pendiente de confirmar.
  accionPendiente = signal<{ tipo: TipoAccion; registro: Registro } | null>(null);

  // Solo se usa cuando tipo === 'renovar': cuántos días quiere
  // renovar el huésped. Se precarga con las noches originales como
  // sugerencia, pero el usuario la puede cambiar en el modal.
  diasRenovacion = signal(1);

  // Solo se usan cuando tipo === 'checkout': cargos que el encargado
  // puede escribir a mano al confirmar la salida. Ninguno se calcula
  // solo — quedan en 0 si no se tocan.
  otroCobroCheckout = signal(0);
  multaTardio = signal(0);

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
    }
    if (tipo === 'checkout') {
      this.otroCobroCheckout.set(0);
      this.multaTardio.set(0);
    }
    this.accionPendiente.set({ tipo, registro });
  }

  cancelarAccion() {
    this.accionPendiente.set(null);
  }

  confirmarAccion() {
    const pendiente = this.accionPendiente();
    if (!pendiente) return;

    let accion$;
    switch (pendiente.tipo) {
      case 'checkout':
        accion$ = this.registrosService.checkout(
          pendiente.registro.id,
          this.otroCobroCheckout(),
          this.multaTardio(),
        );
        break;
      case 'no-renovar':
        accion$ = this.registrosService.actualizarRenovar(pendiente.registro.id, 'NO');
        break;
      case 'renovar':
        accion$ = this.registrosService.actualizarRenovar(
          pendiente.registro.id,
          'SI',
          this.diasRenovacion(),
        );
        break;
    }

    accion$.subscribe(() => {
      this.accionPendiente.set(null);
      this.refrescar();
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

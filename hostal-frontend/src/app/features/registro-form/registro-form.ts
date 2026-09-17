import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RegistrosService } from '../../core/services/registros.service';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal/confirm-modal';
import { LoadingOverlay } from '../../shared/loading-overlay/loading-overlay';
import { LineasCobro, LineaCobro, resolverLineasCobro } from '../../shared/lineas-cobro/lineas-cobro';

// Formatea un Date al formato que espera <input type="datetime-local">
// (YYYY-MM-DDTHH:mm, en hora LOCAL — a diferencia de toISOString() que
// da UTC y desfasaría la hora mostrada).
function aInputDatetimeLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

// Formatea un Date al formato de <input type="date"> (YYYY-MM-DD, hora local).
function aInputDate(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

function ahoraInput(): string {
  return aInputDatetimeLocal(new Date());
}

function mananaInput(): string {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return aInputDate(manana);
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

@Component({
  selector: 'app-registro-form',
  imports: [ReactiveFormsModule, ConfirmModal, LoadingOverlay, LineasCobro, CurrencyPipe, DatePipe],
  templateUrl: './registro-form.html',
})
export class RegistroForm implements OnInit {
  private fb = inject(FormBuilder);
  private registrosService = inject(RegistrosService);
  habitacionesService = inject(HabitacionesService);

  enviando = false;
  mensajeError = '';

  // Reactive Forms: exactamente lo mismo que ya conoces de Angular
  // en general (no cambió con standalone/signals). Los validadores
  // reflejan las mismas reglas del DTO del backend (class-validator);
  // aun así el backend vuelve a validar todo, esto es solo UX.
  form = this.fb.nonNullable.group(
    {
      nombreCliente: ['', Validators.required],
      habitacionId: [0, [Validators.required, Validators.min(1)]],
      camasSolicitadas: [1, [Validators.required, Validators.min(1)]],
      costoPorCama: [150, [Validators.required, Validators.min(0)]],
      // Por defecto "ahora" (el caso normal); se puede cambiar para
      // registrar tarde a alguien que ya llegó.
      checkIn: [ahoraInput(), Validators.required],
      // Por defecto mañana (1 noche); la hora la fija el backend a
      // las 12pm sin importar lo que se vea aquí.
      checkOutFecha: [mananaInput(), Validators.required],
      documentoIdentidad: ['', Validators.required],
      atendio: ['', Validators.required],
      otroCobro: [0, [Validators.min(0)]],
    },
    { validators: [this.camasDisponiblesValidator(this.habitacionesService), this.fechasValidator] },
  );

  // Cómo se paga el total — una o varias líneas (mitad efectivo, mitad
  // tarjeta, etc.). Por defecto un solo renglón con el total completo.
  lineasPago = signal<LineaCobro[]>([{ metodoPago: 'EFECTIVO', cantidad: 0 }]);

  ngOnInit() {
    this.habitacionesService.cargarHabitaciones();
    this.habitacionesService.cargarDisponibilidad();
  }

  mostrarConfirmacion = signal(false);
  mostrarExito = signal(false);

  // Solo valida y abre el modal de confirmación; el POST real ocurre
  // en confirmarEnvio(), después de que el usuario confirma.
  intentarEnviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const lineas = resolverLineasCobro(this.lineasPago(), this.totalPreview());
    const suma = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
    if (Math.abs(suma - this.totalPreview()) > 0.01) {
      this.mensajeError = 'Los pagos no suman el total a cobrar — revisa los montos.';
      return;
    }
    this.mensajeError = '';
    this.mostrarConfirmacion.set(true);
  }

  cancelarEnvio() {
    this.mostrarConfirmacion.set(false);
  }

  confirmarEnvio() {
    this.mostrarConfirmacion.set(false);
    this.enviando = true;
    this.mensajeError = '';

    const { checkIn, checkOutFecha, ...resto } = this.form.getRawValue();
    const pagos = resolverLineasCobro(this.lineasPago(), this.totalPreview());

    this.registrosService
      .crearRegistro({
        ...resto,
        checkIn: new Date(checkIn).toISOString(),
        checkOutFecha,
        pagos,
      })
      .subscribe({
        next: () => {
          this.enviando = false;
          this.mostrarExito.set(true);
          this.registrosService.cargarRegistros();
          this.habitacionesService.cargarDisponibilidad();
        },
        error: (err) => {
          this.enviando = false;
          this.mensajeError = err.error?.message ?? 'Error al crear el registro';
        },
      });
  }

  cerrarExito() {
    this.mostrarExito.set(false);
    this.form.reset({
      nombreCliente: '',
      habitacionId: 0,
      camasSolicitadas: 1,
      costoPorCama: 150,
      checkIn: ahoraInput(),
      checkOutFecha: mananaInput(),
      documentoIdentidad: '',
      atendio: '',
      otroCobro: 0,
    });
    this.lineasPago.set([{ metodoPago: 'EFECTIVO', cantidad: 0 }]);
  }

  // --- Datos para el resumen del modal de confirmación ---

  // Igual que hace el backend: noches = días de calendario que abarca
  // el periodo capturado, redondeado hacia arriba. Puramente para
  // mostrarle al usuario cuánto se le va a cobrar antes de confirmar;
  // el backend vuelve a calcularlo con la misma fórmula al guardar.
  nochesCalculadas(): number {
    const { checkIn, checkOutFecha } = this.form.value;
    if (!checkIn || !checkOutFecha) return 0;
    const inicio = new Date(checkIn);
    const fin = new Date(`${checkOutFecha}T12:00:00`);
    if (fin <= inicio) return 0;
    return Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / MS_POR_DIA));
  }

  checkOutPreview(): Date | null {
    const fecha = this.form.value.checkOutFecha;
    if (!fecha) return null;
    return new Date(`${fecha}T12:00:00`);
  }

  habitacionSeleccionada() {
    const id = this.form.value.habitacionId;
    return this.habitacionesService.disponibilidad().find((h) => h.id === id);
  }

  totalPreview(): number {
    const { camasSolicitadas, costoPorCama, otroCobro } = this.form.value;
    return (camasSolicitadas ?? 0) * (costoPorCama ?? 0) * this.nochesCalculadas() + (otroCobro ?? 0);
  }

  // Para el resumen del modal: con un solo método, muestra el total
  // completo (no lo que haya quedado guardado en la línea, que no se
  // deja editar en ese caso — ver LineasCobro).
  lineasResueltas(): LineaCobro[] {
    return resolverLineasCobro(this.lineasPago(), this.totalPreview());
  }

  camasDisponiblesValidator(habitacionesService: HabitacionesService) {
    return (form: AbstractControl): ValidationErrors | null => {
      const habitacionId = form.get('habitacionId')?.value;
      const camasSolicitadas = form.get('camasSolicitadas')?.value;
      const habitacion = habitacionesService.disponibilidad().find((h) => h.id === habitacionId);
      if (habitacion && camasSolicitadas > habitacion.camasDisponibles) {
        return { camasInsuficientes: { disponibles: habitacion.camasDisponibles } };
      }
      return null;
    };
  }

  // La fecha de salida (a las 12pm) debe ser posterior al check-in —
  // misma regla que valida el backend, aquí solo para avisar antes de
  // enviar.
  fechasValidator(form: AbstractControl): ValidationErrors | null {
    const checkIn = form.get('checkIn')?.value;
    const checkOutFecha = form.get('checkOutFecha')?.value;
    if (!checkIn || !checkOutFecha) return null;
    const inicio = new Date(checkIn);
    const fin = new Date(`${checkOutFecha}T12:00:00`);
    return fin <= inicio ? { fechasInvalidas: true } : null;
  }
}

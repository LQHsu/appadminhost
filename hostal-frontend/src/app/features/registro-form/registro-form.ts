import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RegistrosService } from '../../core/services/registros.service';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { ConfirmModal } from '../../shared/confirm-modal/confirm-modal/confirm-modal';

@Component({
  selector: 'app-registro-form',
  imports: [ReactiveFormsModule, ConfirmModal, CurrencyPipe, DatePipe],
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
      noches: [1, [Validators.required, Validators.min(1)]],
      documentoIdentidad: ['', Validators.required],
      metodoPago: ['EFECTIVO' as 'EFECTIVO' | 'TARJETA', Validators.required],
      atendio: ['', Validators.required],
      otroCobro: [0, [Validators.min(0)]],
    },
    { validators: this.camasDisponiblesValidator(this.habitacionesService) },
  );

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
    this.mostrarConfirmacion.set(true);
  }

  cancelarEnvio() {
    this.mostrarConfirmacion.set(false);
  }

  confirmarEnvio() {
    this.mostrarConfirmacion.set(false);
    this.enviando = true;
    this.mensajeError = '';

    this.registrosService.crearRegistro(this.form.getRawValue()).subscribe({
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
      noches: 1,
      documentoIdentidad: '',
      metodoPago: 'EFECTIVO',
      atendio: '',
      otroCobro: 0,
    });
  }

  // --- Datos para el resumen del modal de confirmación ---

  // Preview del check-out estimado: cálculo aproximado del lado del
  // cliente (hoy + noches). El valor real y definitivo lo congela el
  // backend en el momento exacto en que se guarda el registro.
  previewCheckOut(): Date {
    const noches = this.form.value.noches ?? 0;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + noches);
    return fecha;
  }

  habitacionSeleccionada() {
    const id = this.form.value.habitacionId;
    return this.habitacionesService.disponibilidad().find((h) => h.id === id);
  }

  totalPreview(): number {
    const { camasSolicitadas, costoPorCama, noches, otroCobro } = this.form.value;
    return (camasSolicitadas ?? 0) * (costoPorCama ?? 0) * (noches ?? 0) + (otroCobro ?? 0);
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
}

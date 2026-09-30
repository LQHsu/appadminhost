import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { Habitacion } from '../../core/models/habitacion.model';

// Pantalla mínima para dar de alta habitaciones (piso, número, camas
// totales, tarifa vigente por cama). Sin esto no hay a qué asignar los
// registros.
@Component({
  selector: 'app-habitaciones-admin',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './habitaciones-admin.html',
})
export class HabitacionesAdmin implements OnInit {
  private fb = inject(FormBuilder);
  habitacionesService = inject(HabitacionesService);

  form = this.fb.nonNullable.group({
    piso: [1, [Validators.required, Validators.min(1)]],
    numero: ['', Validators.required],
    camasTotales: [4, [Validators.required, Validators.min(1)]],
    // 0 = sin tarifa fijada todavía (opcional) — mismo sentinel que ya
    // se usa en otros selects/campos opcionales de la app.
    costoPorCama: [0],
  });

  // Habitación que se está editando ahora mismo (null = ninguna).
  editandoId = signal<number | null>(null);
  errorEdicion = signal<string | null>(null);

  editForm = this.fb.nonNullable.group({
    piso: [1, [Validators.required, Validators.min(1)]],
    numero: ['', Validators.required],
    camasTotales: [4, [Validators.required, Validators.min(1)]],
    costoPorCama: [0],
  });

  ngOnInit() {
    this.habitacionesService.cargarHabitaciones();
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { costoPorCama, ...resto } = this.form.getRawValue();
    this.habitacionesService
      .crearHabitacion({ ...resto, costoPorCama: costoPorCama > 0 ? costoPorCama : undefined })
      .subscribe(() => {
        this.form.reset({ piso: 1, numero: '', camasTotales: 4, costoPorCama: 0 });
        this.habitacionesService.cargarHabitaciones();
      });
  }

  editar(h: Habitacion) {
    this.errorEdicion.set(null);
    this.editandoId.set(h.id);
    this.editForm.reset({ piso: h.piso, numero: h.numero, camasTotales: h.camasTotales, costoPorCama: h.costoPorCama ?? 0 });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.errorEdicion.set(null);
  }

  guardarEdicion(id: number) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.errorEdicion.set(null);
    const { costoPorCama, ...resto } = this.editForm.getRawValue();
    this.habitacionesService
      .actualizarHabitacion(id, { ...resto, costoPorCama: costoPorCama > 0 ? costoPorCama : undefined })
      .subscribe({
        next: () => {
          this.editandoId.set(null);
          this.habitacionesService.cargarHabitaciones();
        },
        error: (err) => {
          this.errorEdicion.set(err?.error?.message ?? 'No se pudo guardar el cambio.');
        },
      });
  }
}

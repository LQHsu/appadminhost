import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HabitacionesService } from '../../core/services/habitaciones.service';
import { Habitacion } from '../../core/models/habitacion.model';

// Pantalla mínima para dar de alta habitaciones (piso, número, camas
// totales). Sin esto no hay a qué asignar los registros.
@Component({
  selector: 'app-habitaciones-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './habitaciones-admin.html',
})
export class HabitacionesAdmin implements OnInit {
  private fb = inject(FormBuilder);
  habitacionesService = inject(HabitacionesService);

  form = this.fb.nonNullable.group({
    piso: [1, [Validators.required, Validators.min(1)]],
    numero: ['', Validators.required],
    camasTotales: [4, [Validators.required, Validators.min(1)]],
  });

  // Habitación que se está editando ahora mismo (null = ninguna).
  editandoId = signal<number | null>(null);
  errorEdicion = signal<string | null>(null);

  editForm = this.fb.nonNullable.group({
    piso: [1, [Validators.required, Validators.min(1)]],
    numero: ['', Validators.required],
    camasTotales: [4, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    this.habitacionesService.cargarHabitaciones();
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.habitacionesService.crearHabitacion(this.form.getRawValue()).subscribe(() => {
      this.form.reset({ piso: 1, numero: '', camasTotales: 4 });
      this.habitacionesService.cargarHabitaciones();
    });
  }

  editar(h: Habitacion) {
    this.errorEdicion.set(null);
    this.editandoId.set(h.id);
    this.editForm.reset({ piso: h.piso, numero: h.numero, camasTotales: h.camasTotales });
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
    this.habitacionesService.actualizarHabitacion(id, this.editForm.getRawValue()).subscribe({
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

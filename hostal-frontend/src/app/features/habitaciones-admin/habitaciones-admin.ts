import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HabitacionesService } from '../../core/services/habitaciones.service';

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
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CanalVentaService } from '../../core/services/canal-venta.service';
import { CanalVenta } from '../../core/models/canal-venta.model';

// Catálogo editable de canales de venta (directo, Booking, Hostelworld,
// etc.) que se elige al hacer check-in y se muestra en el historial.
@Component({
  selector: 'app-canal-venta-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './canal-venta-admin.html',
})
export class CanalVentaAdmin implements OnInit {
  private fb = inject(FormBuilder);
  canalVentaService = inject(CanalVentaService);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  error = signal<string | null>(null);

  ngOnInit() {
    this.canalVentaService.cargarCanales();
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.canalVentaService.crearCanal(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ nombre: '' });
        this.canalVentaService.cargarCanales();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo agregar el canal.'),
    });
  }

  // No se borran canales en uso — solo se activan/desactivan para que
  // dejen o no de aparecer como opción al hacer check-in.
  alternarActivo(canal: CanalVenta) {
    this.canalVentaService.actualizarCanal(canal.id, { activo: !canal.activo }).subscribe(() => {
      this.canalVentaService.cargarCanales();
    });
  }
}

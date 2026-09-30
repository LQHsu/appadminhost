import { Component, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ConceptoExtraService } from '../../core/services/concepto-extra.service';
import { ConceptoExtra } from '../../core/models/concepto-extra.model';

// Catálogo editable de conceptos de cobro extra (jabón, toallas,
// lockers, desayuno, depósito en garantía, etc.) que se elige al
// registrar un cobro extra y se muestra en el historial.
@Component({
  selector: 'app-concepto-extra-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './concepto-extra-admin.html',
})
export class ConceptoExtraAdmin implements OnInit {
  private fb = inject(FormBuilder);
  conceptoExtraService = inject(ConceptoExtraService);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  error = signal<string | null>(null);

  ngOnInit() {
    this.conceptoExtraService.cargarConceptos();
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.conceptoExtraService.crearConcepto(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.reset({ nombre: '' });
        this.conceptoExtraService.cargarConceptos();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'No se pudo agregar el concepto.'),
    });
  }

  // No se borran conceptos en uso — solo se activan/desactivan para
  // que dejen o no de aparecer como opción al registrar un cobro extra.
  alternarActivo(concepto: ConceptoExtra) {
    this.conceptoExtraService.actualizarConcepto(concepto.id, { activo: !concepto.activo }).subscribe(() => {
      this.conceptoExtraService.cargarConceptos();
    });
  }
}

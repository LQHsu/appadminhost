import { Component, computed, inject, OnInit } from '@angular/core';
import { HabitacionesService } from '../../core/services/habitaciones.service';

@Component({
  selector: 'app-disponibilidad',
  imports: [],
  templateUrl: './disponibilidad.html',
})
export class Disponibilidad implements OnInit {
  habitacionesService = inject(HabitacionesService);

  // computed(): un signal derivado de otro. Se recalcula solo cuando
  // disponibilidad() cambia — es el equivalente a un getter memoizado,
  // pero reactivo. Aquí lo usamos para el total de camas libres.
  totalDisponibles = computed(() =>
    this.habitacionesService.disponibilidad().reduce((sum, h) => sum + h.camasDisponibles, 0),
  );

  ngOnInit() {
    this.habitacionesService.cargarDisponibilidad();
  }
}

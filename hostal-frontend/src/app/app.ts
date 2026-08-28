import { Component, signal } from '@angular/core';
import { RegistroForm } from './features/registro-form/registro-form';
import { RegistrosList } from './features/registros-list/registros-list';
import { Disponibilidad } from './features/disponibilidad/disponibilidad';
import { HistorialComponent } from './features/historial/historial';
import { HabitacionesAdmin } from './features/habitaciones-admin/habitaciones-admin';

type Tab = 'registro' | 'activos' | 'disponibilidad' | 'habitaciones' | 'historial';

@Component({
  selector: 'app-root',
  imports: [RegistroForm, RegistrosList, Disponibilidad, HistorialComponent, HabitacionesAdmin],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Un signal simple gobierna qué pestaña se ve. No hay routing aquí
  // porque para 5 secciones es innecesario; si el proyecto crece,
  // esto se cambiaría por rutas reales con app.routes.ts.
  tabActiva = signal<Tab>('registro');

  cambiarTab(tab: Tab) {
    this.tabActiva.set(tab);
  }
}

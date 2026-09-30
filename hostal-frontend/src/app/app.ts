import { Component, inject, signal } from '@angular/core';
import { RegistroForm } from './features/registro-form/registro-form';
import { RegistrosList } from './features/registros-list/registros-list';
import { Disponibilidad } from './features/disponibilidad/disponibilidad';
import { HistorialComponent } from './features/historial/historial';
import { HabitacionesAdmin } from './features/habitaciones-admin/habitaciones-admin';
import { CanalVentaAdmin } from './features/canal-venta-admin/canal-venta-admin';
import { ConceptoExtraAdmin } from './features/concepto-extra-admin/concepto-extra-admin';
import { AccessGate } from './shared/access-gate/access-gate';
import { AuthService } from './core/services/auth.service';
import { REQUIERE_CLAVE } from './core/config/api.config';

type Tab = 'registro' | 'activos' | 'disponibilidad' | 'habitaciones' | 'historial';

@Component({
  selector: 'app-root',
  imports: [
    RegistroForm,
    RegistrosList,
    Disponibilidad,
    HistorialComponent,
    HabitacionesAdmin,
    CanalVentaAdmin,
    ConceptoExtraAdmin,
    AccessGate,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  authService = inject(AuthService);

  // Solo tiene sentido mostrar "Cerrar sesión" cuando REALMENTE hay
  // una clave de por medio (build de producción) — en local siempre
  // está "desbloqueado" y el botón no haría nada útil.
  mostrarCerrarSesion = REQUIERE_CLAVE;

  // Un signal simple gobierna qué pestaña se ve. No hay routing aquí
  // porque para 5 secciones es innecesario; si el proyecto crece,
  // esto se cambiaría por rutas reales con app.routes.ts.
  tabActiva = signal<Tab>('registro');

  cambiarTab(tab: Tab) {
    this.tabActiva.set(tab);
  }
}

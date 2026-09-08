import { Component, input } from '@angular/core';

// Overlay de pantalla completa que bloquea cualquier clic mientras hay
// una petición al backend en curso (check-in, checkout, renovar...).
// Existe por esto: el plan gratis de Render "duerme" el backend tras
// un rato sin uso y tarda hasta ~50s en despertar — sin este aviso,
// alguien puede pensar que no pasó nada y reenviar el mismo check-in
// varias veces, creando registros duplicados. z-[60] queda por encima
// del ConfirmModal (z-50) para taparlo también a él mientras procesa.
@Component({
  selector: 'app-loading-overlay',
  imports: [],
  templateUrl: './loading-overlay.html',
})
export class LoadingOverlay {
  visible = input.required<boolean>();
  mensaje = input('Procesando, no cierres ni recargues la página...');
}

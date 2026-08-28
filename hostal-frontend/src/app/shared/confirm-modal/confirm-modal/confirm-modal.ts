import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  imports: [],
  templateUrl: './confirm-modal.html',
})

export class ConfirmModal {
  visible = input.required<boolean>();
  titulo = input ('confirmar');
  mensaje = input ('');
  textoConfirmar = input ('confirmar');
  textoCancelar = input ('cancelar');

  confirmar = output<void>();
  cancelar = output<void>();
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-access-gate',
  imports: [FormsModule],
  templateUrl: './access-gate.html',
})
export class AccessGate {
  authService = inject(AuthService);
  clave = '';

  entrar() {
    if (!this.clave.trim() || this.authService.verificando()) return;
    this.authService.intentarClave(this.clave.trim());
  }
}

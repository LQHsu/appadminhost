import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MetodoPago } from '../../core/models/registro.model';

export interface LineaCobro {
  metodoPago: MetodoPago;
  cantidad: number;
  nota?: string;
}

// Si se pasa `totalObjetivo`, la lista tiene que sumar exacto ese
// monto (check-in/renovación: dividir el cobro entre varios métodos).
// Si se omite, es una lista libre sin monto que cuadrar (cobros extra
// del checkout: cada uno es su propio cargo).
export function resolverLineasCobro(lineas: LineaCobro[], totalObjetivo?: number): LineaCobro[] {
  // Con un solo método y un total fijo, no se le pide a nadie que
  // escriba el monto — es el total completo, así de simple.
  if (totalObjetivo !== undefined && lineas.length === 1) {
    return [{ ...lineas[0], cantidad: totalObjetivo }];
  }
  return lineas;
}

@Component({
  selector: 'app-lineas-cobro',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './lineas-cobro.html',
})
export class LineasCobro {
  lineas = input.required<LineaCobro[]>();
  lineasChange = output<LineaCobro[]>();

  totalObjetivo = input<number | undefined>(undefined);
  mostrarNota = input(false);
  etiquetaAgregar = input('+ Agregar otro método');

  sumaActual = computed(() => this.lineas().reduce((s, l) => s + (Number(l.cantidad) || 0), 0));

  restante = computed(() => {
    const total = this.totalObjetivo();
    if (total === undefined) return null;
    return Math.round((total - this.sumaActual()) * 100) / 100;
  });

  // Con un solo renglón y monto objetivo, el monto no se edita a mano
  // (es el total completo) — solo se muestra editable cuando hay más
  // de un renglón, o cuando no hay un total que cuadrar (cobros extra).
  mostrarCantidadEditable = computed(() => this.totalObjetivo() === undefined || this.lineas().length > 1);

  agregarLinea() {
    this.lineasChange.emit([...this.lineas(), { metodoPago: 'EFECTIVO', cantidad: 0 }]);
  }

  quitarLinea(index: number) {
    this.lineasChange.emit(this.lineas().filter((_, i) => i !== index));
  }

  actualizarMetodo(index: number, metodoPago: MetodoPago) {
    this.lineasChange.emit(this.lineas().map((l, i) => (i === index ? { ...l, metodoPago } : l)));
  }

  actualizarCantidad(index: number, cantidad: number) {
    this.lineasChange.emit(this.lineas().map((l, i) => (i === index ? { ...l, cantidad } : l)));
  }

  actualizarNota(index: number, nota: string) {
    this.lineasChange.emit(this.lineas().map((l, i) => (i === index ? { ...l, nota } : l)));
  }
}

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { MetodoPago, Renovar } from '../../registros/entities/registro.entity';

// Qué disparó esta línea del historial:
// - CHECK_IN: se creó el registro (cobro inicial).
// - RENOVACION: el huésped renovó (cobro solo de los días nuevos).
// - CHECKOUT: el huésped salió/cerró el registro (no genera cobro
//   nuevo, ya se cobró todo en CHECK_IN/RENOVACION; esta línea solo
//   deja constancia de la salida).
export enum TipoEvento {
  CHECK_IN = 'CHECK_IN',
  RENOVACION = 'RENOVACION',
  CHECKOUT = 'CHECKOUT',
}

// Ya no es solo "una fila por estadía escrita al final" (como antes,
// donde todo se guardaba hasta el checkout). Ahora es un LIBRO DE
// MOVIMIENTOS: cada evento de cobro (check-in, cada renovación) y el
// cierre final generan su propia fila, fechada el día en que
// realmente ocurrió. Así el reporte diario refleja el ingreso el día
// que se cobró, no hasta que el huésped finalmente se va.
// `registroOriginalId` conecta todas las filas de una misma estadía.
@Entity()
export class Historial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  registroOriginalId: number;

  @Column({ type: 'simple-enum', enum: TipoEvento })
  tipo: TipoEvento;

  // Fecha que se usa para agrupar en los reportes (diario/mensual/
  // anual): el día del check-in, el día de la renovación, o el día
  // del checkout real, según `tipo`.
  @Column()
  fechaEvento: Date;

  // Periodo de estadía que cubre ESTA línea (no toda la estadía):
  // en CHECK_IN es checkIn -> checkOutEstimado inicial; en
  // RENOVACION es el checkout anterior -> el nuevo checkout; en
  // CHECKOUT es el último checkout estimado -> la salida real.
  @Column()
  periodoDesde: Date;

  @Column()
  periodoHasta: Date;

  @Column()
  nombreCliente: string;

  @Column()
  checkIn: Date;

  @Column({ nullable: true })
  checkOut: Date;

  @Column()
  camas: number;

  @Column('decimal')
  costoPorCama: number;

  @Column()
  noches: number;

  @Column('decimal')
  otroCobro: number;

  // Monto cobrado en ESTE evento puntual (no el total acumulado de la
  // estadía): el cobro inicial en CHECK_IN, solo lo nuevo en
  // RENOVACION, y en CHECKOUT lo que se haya cargado extra al salir
  // (otroCobroCheckout + multaTardio; 0 si no hubo nada que cobrar).
  @Column('decimal')
  totalCobrado: number;

  // Desglose de `totalCobrado` en la línea CHECKOUT (0 en las demás):
  // multa por checkout tardío, capturada a mano.
  @Column('decimal', { default: 0 })
  multa: number;

  @Column()
  piso: number;

  @Column()
  habitacionNumero: string;

  @Column()
  documentoIdentidad: string;

  @Column({ type: 'simple-enum', enum: MetodoPago })
  metodoPago: MetodoPago;

  @Column({ type: 'simple-enum', enum: Renovar })
  renovarFinal: Renovar;

  @Column()
  atendio: string;
}

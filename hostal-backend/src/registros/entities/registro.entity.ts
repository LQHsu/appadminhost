import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Habitacion } from '../../habitaciones/entities/habitacion.entity';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
}

export enum Renovar {
  SI = 'SI',
  NO = 'NO',
  PENDIENTE = 'PENDIENTE', // aún no se decide (equivalente a celda vacía en el Excel)
}

// Equivalente a la hoja "REGISTRO" (control de accesos) del Excel.
// El status (VIGENTE/PENDIENTE/RENOVADO/NO) NO se guarda como columna:
// se calcula al vuelo en el servicio, igual que la fórmula del Excel,
// comparando la hora actual contra checkOutEstimado y el valor de renovar.
@Entity()
export class Registro {
  @PrimaryGeneratedColumn()
  id: number; // N° de registro

  @Column()
  nombreCliente: string;

  // Se congela en el momento de creación (igual que el Excel con cálculo
  // iterativo). Nunca se reescribe después de creado el registro.
  @CreateDateColumn()
  checkIn: Date;

  @Column()
  camasSolicitadas: number;

  @Column('decimal')
  costoPorCama: number;

  @Column()
  noches: number;

  @Column('decimal', { default: 0 })
  otroCobro: number;

  // Calculado y guardado en el momento de crear/editar el registro:
  // (camasSolicitadas * costoPorCama * noches) + otroCobro
  @Column('decimal')
  totalACobrar: number;

  // Estimado al crear el registro: checkIn + noches. Si el huésped
  // hace checkout real antes/después, se sobreescribe con la hora real
  // al mover el registro a Historial.
  @Column()
  checkOutEstimado: Date;

  @Column({ nullable: true })
  checkOutReal: Date;

  // Cargo extra que se decide justo al momento del checkout (ej. daño,
  // consumo, etc.) — no confundir con `otroCobro`, que se fija al
  // hacer el check-in. Se captura a mano en el modal de confirmación.
  @Column('decimal', { default: 0 })
  otroCobroCheckout: number;

  // Multa manual por checkout tardío (checkOutEstimado es siempre a
  // las 12 pm; si el huésped no ha salido después de esa hora, el
  // encargado puede cobrar una multa). Siempre a mano, nunca se
  // calcula sola.
  @Column('decimal', { default: 0 })
  multaTardio: number;

  @ManyToOne(() => Habitacion, (habitacion) => habitacion.registros)
  habitacion: Habitacion;

  @Column()
  documentoIdentidad: string;

  @Column({ type: 'simple-enum', enum: MetodoPago })
  metodoPago: MetodoPago;

  @Column({ type: 'simple-enum', enum: Renovar, default: Renovar.PENDIENTE })
  renovar: Renovar;

  @Column()
  atendio: string;

  // true cuando ya se movió a Historial (liberó camas). Antes de eso
  // cuenta como ocupación activa de la habitación.
  @Column({ default: false })
  cerrado: boolean;
}

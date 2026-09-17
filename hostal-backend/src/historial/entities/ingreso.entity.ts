import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { MetodoPago } from '../../registros/entities/registro.entity';
import { Historial } from './historial.entity';
import { Registro } from '../../registros/entities/registro.entity';

// Por qué entró este dinero, independiente de CÓMO se pagó:
// - HOSPEDAJE: el cobro normal de un CHECK_IN o una RENOVACION.
// - MULTA: multa por checkout tardío.
// - COBRO_EXTRA: cargo adicional decidido al momento del checkout
//   (daños, consumo, etc. — lo que hoy vive en Registro.otroCobroCheckout).
export enum ConceptoIngreso {
  HOSPEDAJE = 'HOSPEDAJE',
  MULTA = 'MULTA',
  COBRO_EXTRA = 'COBRO_EXTRA',
}

// Cada evento de Historial (un check-in, una renovación, un checkout)
// puede tener VARIAS filas de Ingreso — una por cada método de pago
// que se usó para cubrirlo. Así "$1000, mitad efectivo mitad tarjeta"
// deja de ser imposible de representar. En CHECKOUT además puede haber
// varias filas COBRO_EXTRA (varios cargos distintos: minibar, daños,
// etc.), cada una con su propia nota.
@Entity()
export class Ingreso {
  @PrimaryGeneratedColumn()
  id: number;

  // A qué evento pertenece (el check-in, esa renovación puntual, ese
  // checkout).
  @ManyToOne(() => Historial)
  historial: Historial;

  // A qué huésped/estadía pertenece — denormalizado a propósito para
  // poder sacar "todo lo que pagó Fulano" sin tener que pasar por
  // Historial primero.
  @ManyToOne(() => Registro)
  registro: Registro;

  @Column({ type: 'simple-enum', enum: ConceptoIngreso })
  concepto: ConceptoIngreso;

  @Column({ type: 'simple-enum', enum: MetodoPago })
  metodoPago: MetodoPago;

  @Column('decimal')
  cantidad: number;

  // Copiada de Historial.fechaEvento al crear la fila — así los
  // reportes pueden sumar directo sobre Ingreso sin hacer join.
  @Column()
  fecha: Date;

  // Descripción corta y opcional (ej. "minibar", "toalla dañada") —
  // sobre todo útil en COBRO_EXTRA, donde puede haber varias filas
  // distintas y conviene saber qué fue cada una.
  @Column({ nullable: true })
  nota: string;
}

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

// FASE 1 de la migración a "varios métodos de pago por huésped": esta
// tabla por ahora solo EXISTE, nada la escribe ni la lee todavía — el
// comportamiento actual (Historial.metodoPago/totalCobrado) sigue
// siendo la fuente de verdad hasta la Fase 2 (backfill) y Fase 3
// (backend escribiendo aquí en vez de los campos viejos).
//
// Una vez en uso: cada evento de Historial (un check-in, una
// renovación, un checkout) puede tener VARIAS filas de Ingreso — una
// por cada método de pago que se usó para cubrirlo. Así "$1000, mitad
// efectivo mitad tarjeta" deja de ser imposible de representar.
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
}

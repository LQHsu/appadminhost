import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { Denominacion } from './denominacion';

// Registro del conteo físico de efectivo al cerrar caja, para
// conciliar contra lo que el sistema calculó para el mismo rango
// (reporteDiario). Es un registro de auditoría: se crea, nunca se
// edita ni se borra — si algo salió mal, se hace un corte nuevo.
@Entity()
export class CorteCaja {
  @PrimaryGeneratedColumn()
  id: number;

  // Mismo rango de fechas que se estaba viendo en el Reporte Diario
  // al hacer el corte (un solo día es un rango donde desde === hasta).
  @Column()
  desde: Date;

  @Column()
  hasta: Date;

  // Desglose tal cual se contó: [{valor: 500, cantidad: 3}, ...].
  @Column({ type: 'simple-json' })
  denominaciones: Denominacion[];

  // = suma(valor * cantidad) de `denominaciones` — se recalcula en el
  // servidor a partir de `denominaciones`, nunca se confía en un total
  // mandado aparte por el cliente.
  @Column('decimal')
  efectivoContado: number;

  // Snapshot de lo que el sistema tenía calculado para efectivo/tarjeta
  // en ese rango AL MOMENTO del corte (HistorialService.reporteDiario)
  // — se guarda la foto, no una referencia viva, porque una corrección
  // posterior al historial no debe reescribir un corte ya firmado.
  @Column('decimal')
  efectivoSistema: number;

  // efectivoContado - efectivoSistema. Ya viene calculado para no
  // repetir la resta en cada reporte que lo muestre.
  @Column('decimal')
  diferenciaEfectivo: number;

  // Lo que reportó la terminal bancaria — opcional, para conciliar
  // tarjeta igual que el efectivo. Si no se captura, no hay nada que
  // conciliar de tarjeta en este corte.
  @Column('decimal', { nullable: true })
  reporteTerminal: number;

  @Column('decimal')
  tarjetaSistema: number;

  @Column('decimal', { nullable: true })
  diferenciaTarjeta: number;

  // Nombres tal cual se capturan (texto, no firma dibujada) — quien
  // entrega el efectivo (el cajero) y quien lo recibe dentro del
  // hostal.
  @Column()
  entregadoPor: string;

  @Column()
  entregadoA: string;

  @Column({ nullable: true })
  comentarios: string;

  @CreateDateColumn()
  creadoEn: Date;
}

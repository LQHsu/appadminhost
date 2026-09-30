import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// El dueño del hostal recibe solo la DOCUMENTACIÓN del corte (PDF,
// Excel, anexos), no el efectivo — eso ya lo cubre CorteCaja
// (entregadoPor/entregadoA, el control interno del dinero). Este es
// el comprobante de que él recibió esos documentos: registro de
// auditoría, igual que CorteCaja — se crea, nunca se edita ni se borra.
@Entity()
export class AcuseRecepcion {
  @PrimaryGeneratedColumn()
  id: number;

  // Mismo rango de fechas del corte al que acompaña este acuse.
  @Column()
  desde: Date;

  @Column()
  hasta: Date;

  // ['PDF', 'EXCEL', 'ANEXOS'] — cuáles de los documentos se
  // entregaron. simple-json guarda el arreglo tal cual, sin necesitar
  // una tabla aparte para algo tan chico.
  @Column({ type: 'simple-json' })
  documentosEntregados: string[];

  @Column()
  fechaRecepcion: Date;

  // Texto, no firma dibujada — mismo criterio que entregadoPor/
  // entregadoA en CorteCaja.
  @Column()
  firmaRecibio: string;

  @Column({ nullable: true })
  comentarios: string;

  @CreateDateColumn()
  creadoEn: Date;
}

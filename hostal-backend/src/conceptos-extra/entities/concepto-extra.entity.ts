import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Catálogo editable de qué fue un cobro extra (jabón, toallas, lockers,
// desayuno, depósito en garantía, etc.) — mismo patrón que CanalVenta:
// lo administra el propio hostal desde la app, sin necesitar un
// despliegue nuevo para agregar un concepto.
@Entity()
export class ConceptoExtra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  // No se borran conceptos en uso — se desactivan para que dejen de
  // aparecer como opción al capturar un cobro extra nuevo, pero los
  // ingresos que ya los usaron los conservan (ver Ingreso.conceptoExtraNombre).
  @Column({ default: true })
  activo: boolean;
}

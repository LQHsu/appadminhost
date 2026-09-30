import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Catálogo editable de por dónde entró la venta (directo, Booking,
// Hostelworld, etc.) — a diferencia de MetodoPago/ConceptoIngreso (que
// son fijos en el código), este lo administra el propio hostal desde
// la app, sin necesitar un despliegue nuevo para agregar un canal.
@Entity()
export class CanalVenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  // No se borran canales en uso (romperían la relación con Registro) —
  // se desactivan para que dejen de aparecer como opción al hacer
  // check-in, pero los registros que ya los usaron los conservan.
  @Column({ default: true })
  activo: boolean;
}

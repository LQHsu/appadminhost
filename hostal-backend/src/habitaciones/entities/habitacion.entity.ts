import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Registro } from '../../registros/entities/registro.entity';

// Equivalente a la hoja "HABITACIONES" del Excel.
// camasOcupadas y camasDisponibles NO se guardan como columnas fijas:
// se calculan en el servicio a partir de los registros VIGENTES/RENOVADOS
// de esta habitación (igual que las fórmulas del Excel se recalculaban solas).
@Entity()
export class Habitacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  piso: number;

  @Column({ unique: true })
  numero: string; // "101", "102", etc.

  @Column()
  camasTotales: number;

  // Tarifa vigente por cama de esta habitación — referencia para
  // validar los cobros al hacer check-in (hoy el costo se escribe a
  // mano en cada registro, lo que produce montos inconsistentes para
  // la misma cama). Nullable: el catálogo empieza vacío/sin tarifa
  // fijada, y capturar un check-in no debe bloquearse por eso.
  @Column('decimal', { nullable: true })
  costoPorCama: number;

  @OneToMany(() => Registro, (registro) => registro.habitacion)
  registros: Registro[];
}

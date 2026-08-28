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

  @OneToMany(() => Registro, (registro) => registro.habitacion)
  registros: Registro[];
}

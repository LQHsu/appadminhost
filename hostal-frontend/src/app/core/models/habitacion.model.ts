export interface Habitacion {
  id: number;
  piso: number;
  numero: string;
  camasTotales: number;
}

export interface Disponibilidad {
  id: number;
  piso: number;
  numero: string;
  camasTotales: number;
  camasOcupadas: number;
  camasDisponibles: number;
}

export interface CreateHabitacionDto {
  piso: number;
  numero: string;
  camasTotales: number;
}

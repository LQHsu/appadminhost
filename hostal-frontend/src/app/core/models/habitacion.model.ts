export interface Habitacion {
  id: number;
  piso: number;
  numero: string;
  camasTotales: number;
  // Tarifa vigente por cama — puede venir vacía si aún no se le fija
  // ninguna (el catálogo empieza sin tarifas).
  costoPorCama: number | null;
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
  costoPorCama?: number;
}

// Todos opcionales: solo se manda lo que cambió.
export interface UpdateHabitacionDto {
  piso?: number;
  numero?: string;
  camasTotales?: number;
  costoPorCama?: number;
}

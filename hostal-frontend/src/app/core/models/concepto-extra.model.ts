export interface ConceptoExtra {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CreateConceptoExtraDto {
  nombre: string;
}

export interface UpdateConceptoExtraDto {
  nombre?: string;
  activo?: boolean;
}

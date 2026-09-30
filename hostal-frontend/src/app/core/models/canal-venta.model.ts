export interface CanalVenta {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CreateCanalVentaDto {
  nombre: string;
}

export interface UpdateCanalVentaDto {
  nombre?: string;
  activo?: boolean;
}

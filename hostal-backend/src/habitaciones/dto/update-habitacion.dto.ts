import { IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

// Todos los campos opcionales — se manda solo lo que cambió (número,
// piso, cuántas camas tiene en realidad, o su tarifa vigente).
export class UpdateHabitacionDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  piso?: number;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  camasTotales?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  costoPorCama?: number;
}

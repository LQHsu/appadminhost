import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// Todos los campos opcionales — se manda solo lo que cambió (número,
// piso, o cuántas camas tiene en realidad).
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
}

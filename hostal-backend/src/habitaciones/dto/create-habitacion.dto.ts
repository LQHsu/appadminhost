import { IsInt, IsPositive, IsString } from 'class-validator';

export class CreateHabitacionDto {
  @IsInt()
  @IsPositive()
  piso: number;

  @IsString()
  numero: string;

  @IsInt()
  @IsPositive()
  camasTotales: number;
}

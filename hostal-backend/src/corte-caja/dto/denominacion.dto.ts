import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class DenominacionDto {
  @IsNumber()
  @IsPositive()
  valor: number;

  @IsInt()
  @Min(0)
  cantidad: number;
}

import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class DenominacionDto {
  // Opcional por retrocompatibilidad con clientes viejos que todavía
  // no distinguían billete/moneda — el frontend actual siempre lo manda.
  @IsOptional()
  @IsIn(['BILLETE', 'MONEDA'])
  tipo?: 'BILLETE' | 'MONEDA';

  @IsNumber()
  @IsPositive()
  valor: number;

  @IsInt()
  @Min(0)
  cantidad: number;
}

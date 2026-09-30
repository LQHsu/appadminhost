import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { MetodoPago } from '../entities/registro.entity';

// Un cargo extra al momento del checkout o a mitad de estadía (minibar,
// daños, jabón, toallas, lockers, desayuno, depósito, etc.) — puede
// haber varios en un mismo checkout/cobro, cada uno con su propio
// monto, método de pago y nota de qué fue. conceptoExtraId/unidades son
// opcionales: seguir mandando solo `nota` (texto libre) sigue siendo
// válido para quien no quiera usar el catálogo.
export class CobroExtraDto {
  @IsOptional()
  @IsString()
  nota?: string;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsNumber()
  @IsPositive()
  cantidad: number;

  @IsOptional()
  @IsInt()
  conceptoExtraId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  unidades?: number;
}

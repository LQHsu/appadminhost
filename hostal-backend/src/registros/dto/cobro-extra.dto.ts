import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { MetodoPago } from '../entities/registro.entity';

// Un cargo extra al momento del checkout (minibar, daños, etc.) — puede
// haber varios en un mismo checkout, cada uno con su propio monto,
// método de pago y nota de qué fue.
export class CobroExtraDto {
  @IsOptional()
  @IsString()
  nota?: string;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

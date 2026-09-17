import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { MetodoPago } from '../entities/registro.entity';

// Una línea de pago: cuánto y con qué método. Un mismo cobro (check-in,
// renovación) puede tener varias líneas — así se representa "mitad
// efectivo, mitad tarjeta".
export class PagoDto {
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

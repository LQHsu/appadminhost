import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { MetodoPago } from '../entities/registro.entity';

// Los dos cargos que se pueden decidir a mano justo al confirmar el
// checkout. Ambos opcionales: si no se mandan, no se cobra nada extra.
// El método de pago de cada uno es opcional por compatibilidad hacia
// atrás — si hay monto pero no se especifica método, el backend asume
// EFECTIVO (ver registros.service.ts).
export class CheckoutDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  otroCobroCheckout?: number;

  @IsOptional()
  @IsEnum(MetodoPago)
  otroCobroCheckoutMetodoPago?: MetodoPago;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multaTardio?: number;

  @IsOptional()
  @IsEnum(MetodoPago)
  multaTardioMetodoPago?: MetodoPago;
}

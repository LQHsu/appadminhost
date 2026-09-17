import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../entities/registro.entity';
import { CobroExtraDto } from './cobro-extra.dto';

// Los cargos que se pueden decidir a mano justo al confirmar el
// checkout. Todos opcionales: si no se manda nada, no se cobra extra.
export class CheckoutDto {
  // Lista de cargos extra (minibar, daños, etc.) — puede haber varios,
  // cada uno con su propio monto/método/nota.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CobroExtraDto)
  cobrosExtra?: CobroExtraDto[];

  // DEPRECADOS: usar `cobrosExtra`. Se mantienen por compatibilidad
  // hacia atrás — si se mandan sin `cobrosExtra`, se arma una sola
  // línea de cobro extra con estos valores.
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

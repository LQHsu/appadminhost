import { IsArray, ArrayMinSize, IsEnum, IsInt, IsOptional, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago, Renovar } from '../entities/registro.entity';
import { PagoDto } from './pago.dto';

export class ActualizarRenovarDto {
  @IsEnum(Renovar)
  renovar: Renovar;

  @IsOptional()
  @IsInt()
  @IsPositive()
  diasRenovacion?: number;

  // DEPRECADO: usar `pagos`. Solo aplica cuando renovar === 'SI'.
  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  // Cómo se pagó la renovación. Solo aplica/requerido cuando
  // renovar === 'SI' (un "no renovó" no cobra nada).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagoDto)
  pagos?: PagoDto[];
}

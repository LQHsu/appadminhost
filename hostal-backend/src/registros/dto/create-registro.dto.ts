import {
  IsString,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  IsEnum,
  IsOptional,
  IsISO8601,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago, Renovar } from '../entities/registro.entity';
import { PagoDto } from './pago.dto';

// Estas son las "celdas amarillas" del Excel: lo único que el
// cliente (frontend) puede mandar. "Noches" ya NO se manda — el
// backend la calcula sola a partir de checkIn/checkOutFecha, así el
// cobro siempre coincide con el periodo real capturado.
export class CreateRegistroDto {
  @IsString()
  nombreCliente: string;

  @IsInt()
  @IsPositive()
  camasSolicitadas: number;

  @IsNumber()
  @IsPositive()
  costoPorCama: number;

  // Fecha Y hora exacta de entrada. Opcional: si no se manda, el
  // backend usa "ahora" (el caso normal, alguien llegando en este
  // momento). Se manda cuando se registra tarde a alguien que ya llegó.
  @IsOptional()
  @IsISO8601()
  checkIn?: string;

  // Solo la FECHA de salida (YYYY-MM-DD) — la hora siempre se fija a
  // las 12 pm en el backend, igual que las renovaciones.
  @IsDateString()
  checkOutFecha: string;

  @IsInt()
  habitacionId: number;

  @IsString()
  documentoIdentidad: string;

  // DEPRECADO: usar `pagos`. Se mantiene opcional por compatibilidad
  // con el frontend viejo mientras se termina de migrar — si se manda
  // `metodoPago` sin `pagos`, el backend arma una sola línea de pago
  // con el total completo.
  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  // Cómo se pagó el total a cobrar — una o varias líneas (ej. mitad
  // efectivo, mitad tarjeta). La suma debe coincidir con el total.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagoDto)
  pagos?: PagoDto[];

  @IsOptional()
  @IsEnum(Renovar)
  renovar?: Renovar;

  @IsString()
  atendio: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otroCobro?: number;
}

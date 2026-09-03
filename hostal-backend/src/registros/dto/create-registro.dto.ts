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
} from 'class-validator';
import { MetodoPago, Renovar } from '../entities/registro.entity';

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

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

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

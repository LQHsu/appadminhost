import {
  IsString,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { MetodoPago, Renovar } from '../entities/registro.entity';

// Estas son las "celdas amarillas" del Excel: lo único que el
// cliente (frontend) puede mandar. Todo lo demás (checkIn, total,
// status, checkOut) lo calcula el backend.
export class CreateRegistroDto {
  @IsString()
  nombreCliente: string;

  @IsInt()
  @IsPositive()
  camasSolicitadas: number;

  @IsNumber()
  @IsPositive()
  costoPorCama: number;

  @IsInt()
  @IsPositive()
  noches: number;

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

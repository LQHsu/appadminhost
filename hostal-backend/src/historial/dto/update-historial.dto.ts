import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { PagoLineaHistorialDto } from './pago-linea-historial.dto';

// Corrección de una fila ya guardada del historial: el personal se
// equivoca al capturar el monto o el método de pago, y no había forma
// de arreglarlo sin editar la base a mano. Todo opcional — se manda
// solo lo que se quiere corregir.
export class UpdateHistorialDto {
  @IsOptional()
  @IsString()
  nombreCliente?: string;

  @IsOptional()
  @IsISO8601()
  fechaEvento?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalCobrado?: number;

  // Si se manda, reemplaza TODO el desglose de pagos de esta fila (no
  // se mezcla con el anterior) — debe sumar el totalCobrado (nuevo o
  // el actual si no se edita).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagoLineaHistorialDto)
  pagos?: PagoLineaHistorialDto[];
}

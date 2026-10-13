import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { MetodoPago } from '../../registros/entities/registro.entity';

// Una línea del desglose de pago al editar una fila de historial:
// mismo shape que CobroExtraDto (registros/dto/cobro-extra.dto.ts),
// definido aparte para no acoplar el contrato de este módulo al de
// registros. conceptoExtraId/unidades solo aplican a filas COBRO_EXTRA/
// MULTA — se incluyen aquí para que editar el monto de una de esas
// filas no borre el concepto/unidades ya capturados.
export class PagoLineaHistorialDto {
  @IsOptional()
  @IsString()
  nota?: string;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  // Min(0), no IsPositive(): un checkout sin cargo extra edita una
  // línea en $0 (mismo criterio que UpdateHistorialDto.totalCobrado).
  @IsNumber()
  @Min(0)
  cantidad: number;

  @IsOptional()
  @IsInt()
  conceptoExtraId?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  unidades?: number;

  // Solo aplica a líneas TARJETA: lo que depositó el procesador de
  // pagos ya con su comisión descontada.
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoNeto?: number;
}

import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { MetodoPago } from '../../registros/entities/registro.entity';

// Una línea del desglose de pago al editar una fila de historial:
// mismo shape que CobroExtraDto (registros/dto/cobro-extra.dto.ts),
// definido aparte para no acoplar el contrato de este módulo al de
// registros.
export class PagoLineaHistorialDto {
  @IsOptional()
  @IsString()
  nota?: string;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsNumber()
  @IsPositive()
  cantidad: number;
}

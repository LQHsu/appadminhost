import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { DenominacionDto } from './denominacion.dto';

export class CreateCorteCajaDto {
  // YYYY-MM-DD — mismo rango que se estaba viendo en el Reporte Diario.
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DenominacionDto)
  denominaciones: DenominacionDto[];

  @IsOptional()
  @IsNumber()
  @IsPositive()
  reporteTerminal?: number;

  @IsString()
  entregadoPor: string;

  @IsString()
  entregadoA: string;

  @IsOptional()
  @IsString()
  comentarios?: string;
}

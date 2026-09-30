import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export const DOCUMENTOS_VALIDOS = ['PDF', 'EXCEL', 'ANEXOS'] as const;

export class CreateAcuseRecepcionDto {
  // YYYY-MM-DD — mismo rango que el corte al que acompaña.
  @IsDateString()
  desde: string;

  @IsDateString()
  hasta: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(DOCUMENTOS_VALIDOS, { each: true })
  documentosEntregados: string[];

  // YYYY-MM-DD — el día en que se recibió la documentación (puede no
  // ser hoy: a veces se revisan cortes acumulados días después).
  @IsDateString()
  fechaRecepcion: string;

  @IsString()
  firmaRecibio: string;

  @IsOptional()
  @IsString()
  comentarios?: string;
}

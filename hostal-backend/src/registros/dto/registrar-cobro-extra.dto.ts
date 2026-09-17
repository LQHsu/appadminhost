import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CobroExtraDto } from './cobro-extra.dto';

// Uno o varios cargos extra a mitad de la estadía (sin checkout) —
// ej. minibar de hoy, algo que se rompió — cada uno con su propio
// monto/método/nota.
export class RegistrarCobroExtraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CobroExtraDto)
  cobros: CobroExtraDto[];
}

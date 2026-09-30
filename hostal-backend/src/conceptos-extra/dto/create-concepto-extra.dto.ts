import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConceptoExtraDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}

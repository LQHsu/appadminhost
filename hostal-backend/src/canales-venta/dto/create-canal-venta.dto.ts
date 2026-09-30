import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCanalVentaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;
}

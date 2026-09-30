import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConceptoExtraDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

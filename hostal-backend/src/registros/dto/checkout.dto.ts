import { IsNumber, IsOptional, Min } from 'class-validator';

// Los dos cargos que se pueden decidir a mano justo al confirmar el
// checkout. Ambos opcionales: si no se mandan, no se cobra nada extra.
export class CheckoutDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  otroCobroCheckout?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multaTardio?: number;
}

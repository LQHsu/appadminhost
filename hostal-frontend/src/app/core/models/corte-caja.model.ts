// El $20 existe como billete y como moneda — tipo + valor identifica
// la línea (valor solo no alcanza, ya que billete y moneda del mismo
// valor serían indistinguibles).
export type TipoDenominacion = 'BILLETE' | 'MONEDA';

export interface Denominacion {
  tipo: TipoDenominacion;
  valor: number;
  cantidad: number;
}

export interface CorteCaja {
  id: number;
  desde: string;
  hasta: string;
  denominaciones: Denominacion[];
  efectivoContado: number;
  efectivoSistema: number;
  diferenciaEfectivo: number;
  reporteTerminal: number | null;
  tarjetaSistema: number;
  diferenciaTarjeta: number | null;
  entregadoPor: string;
  entregadoA: string;
  comentarios: string | null;
  creadoEn: string;
}

export interface CreateCorteCajaDto {
  desde: string;
  hasta: string;
  denominaciones: Denominacion[];
  reporteTerminal?: number;
  entregadoPor: string;
  entregadoA: string;
  comentarios?: string;
}

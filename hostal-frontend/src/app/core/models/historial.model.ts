import { MetodoPago, Renovar } from './registro.model';

export type TipoEvento = 'CHECK_IN' | 'RENOVACION' | 'CHECKOUT';

export interface Historial {
  id: number;
  registroOriginalId: number;
  // Qué disparó esta línea: check-in, renovación o checkout. Varias
  // filas pueden compartir registroOriginalId (una por cada evento de
  // una misma estadía).
  tipo: TipoEvento;
  // Fecha usada para agrupar en los reportes (día real del evento).
  fechaEvento: string;
  // Periodo de estadía que cubre esta línea en particular.
  periodoDesde: string;
  periodoHasta: string;
  nombreCliente: string;
  checkIn: string;
  checkOut: string | null;
  camas: number;
  costoPorCama: number;
  noches: number;
  otroCobro: number;
  // Monto cobrado en ESTE evento (no el acumulado de la estadía).
  totalCobrado: number;
  // Desglose de totalCobrado en la línea CHECKOUT: multa por salida
  // tardía (0 en las demás líneas).
  multa: number;
  piso: number;
  habitacionNumero: string;
  documentoIdentidad: string;
  metodoPago: MetodoPago;
  renovarFinal: Renovar;
  atendio: string;
}

export interface ReporteMensual {
  anio: number;
  mes: number;
  totalIngresos: number;
  efectivo: number;
  tarjeta: number;
  numeroHuespedes: number;
}

// Un renglón por mes dentro del reporte anual (mismas columnas que el
// mensual, menos "anio" que ya vive en el objeto padre).
export interface ReporteMesAnual {
  mes: number;
  totalIngresos: number;
  efectivo: number;
  tarjeta: number;
  numeroHuespedes: number;
}

export interface ReporteAnual {
  anio: number;
  meses: ReporteMesAnual[];
  totalAnual: {
    totalIngresos: number;
    efectivo: number;
    tarjeta: number;
    numeroHuespedes: number;
  };
}

// Reporte diario = reporte por rango de fechas (un solo día es un
// rango donde desde === hasta). A diferencia de mensual/anual, no
// agrupa nada: trae el resumen (mismos 4 recuadros) + cada línea del
// historial dentro del rango, para la tabla del corte de caja.
export interface ReporteRango {
  desde: string;
  hasta: string;
  resumen: {
    totalIngresos: number;
    efectivo: number;
    tarjeta: number;
    numeroHuespedes: number;
  };
  filas: Historial[];
}

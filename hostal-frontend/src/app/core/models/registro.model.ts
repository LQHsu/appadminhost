import { Habitacion } from './habitacion.model';

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
export type Renovar = 'SI' | 'NO' | 'PENDIENTE';
export type Status = 'VIGENTE' | 'PENDIENTE' | 'RENOVADO' | 'NO';

// Refleja exactamente lo que regresa el backend (incluye "status"
// calculado, que el backend agrega en cada respuesta).
export interface Registro {
  id: number;
  nombreCliente: string;
  checkIn: string; // ISO date string
  camasSolicitadas: number;
  costoPorCama: number;
  noches: number;
  otroCobro: number;
  totalACobrar: number;
  checkOutEstimado: string;
  checkOutReal: string | null;
  // Cargos decididos a mano al momento del checkout (0 hasta que se
  // haga el checkout).
  otroCobroCheckout: number;
  multaTardio: number;
  habitacion: Habitacion;
  documentoIdentidad: string;
  metodoPago: MetodoPago;
  renovar: Renovar;
  atendio: string;
  cerrado: boolean;
  status: Status;
  // Independiente del status: ya pasó el checkout estimado (12 pm) y
  // el huésped sigue sin salir. Un "NO renovó" vencido también es
  // `true` aquí, aunque su status se quede en 'NO'.
  vencido: boolean;
}

// Solo las "celdas amarillas": lo único que el frontend puede enviar
// al crear un registro. "Noches" ya no se manda — el backend la
// calcula sola a partir de checkIn/checkOutFecha.
export interface CreateRegistroDto {
  nombreCliente: string;
  camasSolicitadas: number;
  costoPorCama: number;
  // Fecha y hora exacta de entrada (ISO). Opcional: si se omite, el
  // backend usa "ahora".
  checkIn?: string;
  // Solo la FECHA de salida (YYYY-MM-DD) — la hora se fija a las 12pm
  // en el backend.
  checkOutFecha: string;
  habitacionId: number;
  documentoIdentidad: string;
  metodoPago: MetodoPago;
  renovar?: Renovar;
  atendio: string;
  otroCobro?: number;
}

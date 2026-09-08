// El hostal opera en hora del centro de México (UTC-6, sin horario de
// verano desde 2022). El servidor (Render) corre en UTC — usar
// Date.setHours(12) fijaba "las 12" en la hora LOCAL DEL SERVIDOR
// (UTC), es decir, 6 am hora real del hostal, no mediodía. Por eso el
// sistema sugería multa/marcaba "vencido" horas antes de tiempo.
//
// Si el hostal alguna vez cambia de zona horaria, este es el único
// número que hay que tocar.
const OFFSET_HOSTAL_HORAS = -6;

function offsetComoTexto(horas: number): string {
  const signo = horas <= 0 ? '-' : '+';
  const abs = String(Math.abs(horas)).padStart(2, '0');
  return `${signo}${abs}:00`;
}

// Instante UTC que corresponde a las 12:00 pm hora del hostal, para la
// fecha dada (YYYY-MM-DD). Al incluir el offset explícito en el string,
// JS lo interpreta como un instante absoluto — el resultado es correcto
// sin importar en qué zona horaria esté corriendo el proceso.
export function medioDiaHostal(fechaYMD: string): Date {
  return new Date(`${fechaYMD}T12:00:00${offsetComoTexto(OFFSET_HOSTAL_HORAS)}`);
}

// Igual que medioDiaHostal, pero para las 00:00 (medianoche) — usado
// para armar los rangos "desde/hasta" de los reportes. Importante:
// esto es lo que hace que "reporte del día 7" cubra el día 7 completo
// EN HORA DEL HOSTAL, no un rango desfasado 6 horas por pensar en UTC.
export function medianocheHostal(fechaYMD: string): Date {
  return new Date(`${fechaYMD}T00:00:00${offsetComoTexto(OFFSET_HOSTAL_HORAS)}`);
}

// Un día completo en milisegundos — con offset fijo (sin horario de
// verano) sumar esto siempre avanza exactamente un día calendario.
export const UN_DIA_MS = 24 * 60 * 60 * 1000;

// La operación inversa: dado un instante, ¿qué fecha (YYYY-MM-DD) es
// esa hora del hostal? Usa los getters UTC (no los locales) después de
// desplazar por el offset — así el resultado es correcto sin importar
// en qué zona horaria esté corriendo el proceso que lo ejecuta.
export function fechaYMDHostal(fecha: Date): string {
  const ajustada = new Date(fecha.getTime() + OFFSET_HOSTAL_HORAS * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ajustada.getUTCFullYear()}-${pad(ajustada.getUTCMonth() + 1)}-${pad(ajustada.getUTCDate())}`;
}

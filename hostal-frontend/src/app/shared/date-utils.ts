// Formatea un Date al formato que espera <input type="datetime-local">
// (YYYY-MM-DDTHH:mm, en hora LOCAL — a diferencia de toISOString() que
// da UTC y desfasaría la hora mostrada).
export function aInputDatetimeLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

export function ahoraInput(): string {
  return aInputDatetimeLocal(new Date());
}

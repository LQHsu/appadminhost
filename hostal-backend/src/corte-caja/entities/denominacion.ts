// Una línea del conteo físico: cuántos billetes/monedas de este valor
// se contaron. Se guarda tal cual la capturó quien hizo el corte — no
// se valida contra una lista fija de denominaciones (billetes/monedas
// nuevos o descontinuados no deberían requerir tocar código).
export interface Denominacion {
  valor: number;
  cantidad: number;
}

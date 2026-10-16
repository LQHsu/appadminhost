// Una línea del conteo físico: cuántos billetes/monedas de este valor
// se contaron. Se guarda tal cual la capturó quien hizo el corte — no
// se valida contra una lista fija de denominaciones (billetes/monedas
// nuevos o descontinuados no deberían requerir tocar código).
//
// tipo es opcional porque cortes guardados antes de que se agregara
// este campo no lo tienen — el $20 existe como billete y como moneda,
// y sin tipo esas dos líneas eran indistinguibles (ver bug: el conteo
// de una pisaba al de la otra).
export interface Denominacion {
  tipo?: 'BILLETE' | 'MONEDA';
  valor: number;
  cantidad: number;
}

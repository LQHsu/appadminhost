import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Historial, TipoEvento } from './entities/historial.entity';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(Historial)
    private historialRepo: Repository<Historial>,
  ) {}

  create(data: Partial<Historial>) {
    const historial = this.historialRepo.create(data);
    return this.historialRepo.save(historial);
  }

  findAll() {
    return this.historialRepo.find({ order: { fechaEvento: 'DESC' } });
  }

  // "N° huéspedes" cuenta personas (check-ins), no movimientos: una
  // renovación o un checkout no son un huésped nuevo, son la misma
  // estadía siguiendo su curso.
  private numeroHuespedes(filas: Historial[]) {
    return filas.filter((r) => r.tipo === TipoEvento.CHECK_IN).length;
  }

  // Mismo cálculo (ingresos totales/efectivo/tarjeta/# huéspedes) que
  // usan reporteMensual, reporteAnual y reporteDiario — cada uno solo
  // cambia CÓMO agrupa las filas antes de pasarlas aquí.
  private resumenDeFilas(filas: Historial[]) {
    const efectivo = filas
      .filter((r) => r.metodoPago === 'EFECTIVO')
      .reduce((sum, r) => sum + Number(r.totalCobrado), 0);
    const tarjeta = filas
      .filter((r) => r.metodoPago === 'TARJETA')
      .reduce((sum, r) => sum + Number(r.totalCobrado), 0);

    return {
      totalIngresos: efectivo + tarjeta,
      efectivo,
      tarjeta,
      numeroHuespedes: this.numeroHuespedes(filas),
    };
  }

  // Equivalente a la tabla de reporte mensual: ingresos totales,
  // efectivo, tarjeta y # de huéspedes, agrupado por el mes que pidas.
  // Se agrupa por `fechaEvento` (cuándo se cobró cada movimiento:
  // check-in, renovación o checkout), no por la fecha de salida final,
  // así el mes en que entró/renovó un huésped ya refleja ese ingreso.
  async reporteMensual(anio: number, mes: number) {
    // mes: 1-12
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1); // primer día del mes siguiente

    const registros = await this.historialRepo.find({
      where: { fechaEvento: Between(inicio, fin) },
    });

    return { anio, mes, ...this.resumenDeFilas(registros) };
  }

  // Reporte anual: un renglón por cada uno de los 12 meses (aunque no
  // tengan movimientos, para que la tabla/gráfica siempre tenga las
  // 12 barras) + el acumulado del año completo.
  async reporteAnual(anio: number) {
    const inicio = new Date(anio, 0, 1);
    const fin = new Date(anio + 1, 0, 1);

    const registros = await this.historialRepo.find({
      where: { fechaEvento: Between(inicio, fin) },
    });

    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const delMes = registros.filter((r) => new Date(r.fechaEvento).getMonth() === i);
      return { mes, ...this.resumenDeFilas(delMes) };
    });

    const totalAnual = meses.reduce(
      (acc, m) => ({
        totalIngresos: acc.totalIngresos + m.totalIngresos,
        efectivo: acc.efectivo + m.efectivo,
        tarjeta: acc.tarjeta + m.tarjeta,
        numeroHuespedes: acc.numeroHuespedes + m.numeroHuespedes,
      }),
      { totalIngresos: 0, efectivo: 0, tarjeta: 0, numeroHuespedes: 0 },
    );

    return { anio, meses, totalAnual };
  }

  // Reporte diario, ahora por rango de fechas (un solo día es un rango
  // de un día): a diferencia de mensual/anual, aquí no agrupamos nada
  // — regresamos cada línea del historial dentro del rango (para la
  // tabla del corte de caja) más el resumen ya calculado, listo para
  // los mismos recuadros que ya usa el reporte mensual.
  // `hasta` debe venir como el primer instante DESPUÉS del rango (ej.
  // "día siguiente a las 00:00") para incluir el último día completo.
  async reporteDiario(desde: Date, hasta: Date) {
    const filas = await this.historialRepo.find({
      where: { fechaEvento: Between(desde, hasta) },
      order: { fechaEvento: 'ASC' },
    });

    return { desde, hasta, resumen: this.resumenDeFilas(filas), filas };
  }
}

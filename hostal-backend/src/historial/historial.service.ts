import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Historial, TipoEvento } from './entities/historial.entity';
import { Ingreso } from './entities/ingreso.entity';
import { medianocheHostal, fechaYMDHostal } from '../common/zona-horaria';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(Historial)
    private historialRepo: Repository<Historial>,
    @InjectRepository(Ingreso)
    private ingresoRepo: Repository<Ingreso>,
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
  // estadía siguiendo su curso. Sigue viniendo de Historial (no de
  // Ingreso) porque no cambia según cuántos métodos de pago se usaron.
  private numeroHuespedes(filas: Historial[]) {
    return filas.filter((r) => r.tipo === TipoEvento.CHECK_IN).length;
  }

  // Ingresos totales/efectivo/tarjeta salen de sumar Ingreso (no
  // Historial.totalCobrado): así un mismo cobro pagado mitad efectivo
  // mitad tarjeta se refleja correcto en cada columna, cosa que con un
  // solo `metodoPago` por evento no se podía representar.
  private resumenDeIngresos(ingresos: Ingreso[], filasHistorial: Historial[]) {
    const efectivo = ingresos
      .filter((i) => i.metodoPago === 'EFECTIVO')
      .reduce((sum, i) => sum + Number(i.cantidad), 0);
    const tarjeta = ingresos
      .filter((i) => i.metodoPago === 'TARJETA')
      .reduce((sum, i) => sum + Number(i.cantidad), 0);

    return {
      totalIngresos: efectivo + tarjeta,
      efectivo,
      tarjeta,
      numeroHuespedes: this.numeroHuespedes(filasHistorial),
    };
  }

  // Equivalente a la tabla de reporte mensual: ingresos totales,
  // efectivo, tarjeta y # de huéspedes, agrupado por el mes que pidas.
  // Se agrupa por `fecha`/`fechaEvento` (cuándo se cobró cada
  // movimiento: check-in, renovación o checkout), no por la fecha de
  // salida final, así el mes en que entró/renovó un huésped ya refleja
  // ese ingreso.
  async reporteMensual(anio: number, mes: number) {
    // mes: 1-12. medianocheHostal (no `new Date(anio, mes, dia)`, que
    // usa la hora LOCAL DEL SERVIDOR) evita que el primer/último día
    // del mes queden desfasados por la diferencia de zona horaria.
    const pad = (n: number) => String(n).padStart(2, '0');
    const inicio = medianocheHostal(`${anio}-${pad(mes)}-01`);
    const siguienteMes = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
    const fin = medianocheHostal(`${siguienteMes.anio}-${pad(siguienteMes.mes)}-01`); // primer día del mes siguiente

    const [filasHistorial, ingresos] = await Promise.all([
      this.historialRepo.find({ where: { fechaEvento: Between(inicio, fin) } }),
      this.ingresoRepo.find({ where: { fecha: Between(inicio, fin) } }),
    ]);

    return { anio, mes, ...this.resumenDeIngresos(ingresos, filasHistorial) };
  }

  // Reporte anual: un renglón por cada uno de los 12 meses (aunque no
  // tengan movimientos, para que la tabla/gráfica siempre tenga las
  // 12 barras) + el acumulado del año completo.
  async reporteAnual(anio: number) {
    const inicio = medianocheHostal(`${anio}-01-01`);
    const fin = medianocheHostal(`${anio + 1}-01-01`);

    const [filasHistorial, ingresos] = await Promise.all([
      this.historialRepo.find({ where: { fechaEvento: Between(inicio, fin) } }),
      this.ingresoRepo.find({ where: { fecha: Between(inicio, fin) } }),
    ]);

    const meses = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      // fechaYMDHostal (no .getMonth() a secas, que lee la hora LOCAL
      // DEL SERVIDOR) — evita que un movimiento de fin de mes cerca de
      // la medianoche se cuente en el mes equivocado.
      const delMesHistorial = filasHistorial.filter(
        (r) => Number(fechaYMDHostal(new Date(r.fechaEvento)).split('-')[1]) === mes,
      );
      const delMesIngresos = ingresos.filter(
        (i) => Number(fechaYMDHostal(new Date(i.fecha)).split('-')[1]) === mes,
      );
      return { mes, ...this.resumenDeIngresos(delMesIngresos, delMesHistorial) };
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
    const [filas, ingresos] = await Promise.all([
      this.historialRepo.find({
        where: { fechaEvento: Between(desde, hasta) },
        order: { fechaEvento: 'ASC' },
      }),
      this.ingresoRepo.find({ where: { fecha: Between(desde, hasta) } }),
    ]);

    return { desde, hasta, resumen: this.resumenDeIngresos(ingresos, filas), filas };
  }
}

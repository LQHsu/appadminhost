import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, MoreThan, Repository } from 'typeorm';
import { Historial, TipoEvento } from './entities/historial.entity';
import { Ingreso, ConceptoIngreso } from './entities/ingreso.entity';
import { Registro } from '../registros/entities/registro.entity';
import { UpdateHistorialDto } from './dto/update-historial.dto';
import { medianocheHostal, fechaYMDHostal } from '../common/zona-horaria';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(Historial)
    private historialRepo: Repository<Historial>,
    @InjectRepository(Ingreso)
    private ingresoRepo: Repository<Ingreso>,
    private dataSource: DataSource,
  ) {}

  create(data: Partial<Historial>) {
    const historial = this.historialRepo.create(data);
    return this.historialRepo.save(historial);
  }

  // Corrige una fila ya guardada: el personal se equivoca al capturar
  // el monto o el método de pago, y hasta ahora no había forma de
  // arreglarlo sin tocar la base a mano. Protegido aparte por
  // EditPasswordGuard (ver historial.controller.ts).
  async actualizar(id: number, dto: UpdateHistorialDto) {
    return this.dataSource.transaction(async (manager) => {
      const historial = await manager.findOne(Historial, { where: { id } });
      if (!historial) throw new NotFoundException(`Historial ${id} no encontrado`);

      const totalAnterior = Number(historial.totalCobrado);
      const nuevoTotal = dto.totalCobrado ?? totalAnterior;

      if (dto.pagos && dto.pagos.length > 0) {
        const suma = dto.pagos.reduce((s, p) => s + p.cantidad, 0);
        if (Math.abs(suma - nuevoTotal) > 0.01) {
          throw new BadRequestException(
            `La suma de los pagos ($${suma.toFixed(2)}) no coincide con el total corregido ($${nuevoTotal.toFixed(2)})`,
          );
        }
      }

      // El Registro original solo hace falta si se toca dinero — una
      // corrección de nombre/fecha no necesita ajustar totalACobrar.
      let registro: Registro | null = null;
      if (dto.totalCobrado !== undefined || dto.pagos) {
        registro = await manager.findOne(Registro, { where: { id: historial.registroOriginalId } });
        if (!registro) {
          throw new NotFoundException(
            `No se encontró el registro original #${historial.registroOriginalId} — no se puede ajustar el total`,
          );
        }
      }

      if (dto.nombreCliente !== undefined) historial.nombreCliente = dto.nombreCliente;
      if (dto.fechaEvento !== undefined) historial.fechaEvento = new Date(dto.fechaEvento);
      if (dto.totalCobrado !== undefined) historial.totalCobrado = dto.totalCobrado;

      if (dto.pagos && dto.pagos.length > 0) {
        // Se reemplaza TODO el desglose. `concepto` es solo informativo
        // (resumenDeIngresos() de abajo nunca lo lee, solo metodoPago),
        // así que basta con conservar el de la primera línea existente.
        const existentes = await manager.find(Ingreso, { where: { historial: { id } } });
        const concepto = existentes[0]?.concepto ?? ConceptoIngreso.HOSPEDAJE;
        if (existentes.length > 0) await manager.remove(existentes);

        for (const pago of dto.pagos) {
          await manager.save(
            manager.create(Ingreso, {
              historial: { id } as Ingreso['historial'],
              registro: { id: historial.registroOriginalId } as Ingreso['registro'],
              concepto,
              metodoPago: pago.metodoPago,
              cantidad: pago.cantidad,
              nota: pago.nota,
              fecha: historial.fechaEvento,
            }),
          );
        }
        historial.metodoPago = dto.pagos[0].metodoPago;
      } else if (dto.fechaEvento !== undefined) {
        // No se tocó `pagos`, pero sí la fecha: hay que mover también
        // Ingreso.fecha, que es de donde salen los totales de los
        // reportes (no de Historial.fechaEvento) — si no, la fila se
        // vería bajo el día nuevo pero el dinero seguiría contando en
        // el resumen del día viejo.
        await manager.update(Ingreso, { historial: { id } }, { fecha: historial.fechaEvento });
      }

      await manager.save(historial);

      if (registro && dto.totalCobrado !== undefined) {
        const delta = nuevoTotal - totalAnterior;
        if (delta !== 0) {
          registro.totalACobrar = Number(registro.totalACobrar) + delta;
          await manager.save(registro);
        }
      }

      return historial;
    });
  }

  // Borra el evento MÁS RECIENTE de una estadía (deshacer el último
  // error, en orden) — revierte los campos del Registro que ese evento
  // había tocado. Si era el único evento (necesariamente un CHECK_IN,
  // el primero en crearse), se borra también el Registro completo.
  async eliminar(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const historial = await manager.findOne(Historial, { where: { id } });
      if (!historial) throw new NotFoundException(`Historial ${id} no encontrado`);

      // Se compara por id (orden de inserción), no por fechaEvento —
      // esa ya se puede editar (ver actualizar()) y dejó de ser
      // confiable como orden real de los eventos.
      const eventosPosteriores = await manager.count(Historial, {
        where: { registroOriginalId: historial.registroOriginalId, id: MoreThan(historial.id) },
      });
      if (eventosPosteriores > 0) {
        throw new BadRequestException(
          'No puedes eliminar este evento porque hay eventos posteriores de la misma estadía — elimínalos primero, en orden',
        );
      }

      await manager.delete(Ingreso, { historial: { id } });

      const totalEventos = await manager.count(Historial, {
        where: { registroOriginalId: historial.registroOriginalId },
      });

      if (totalEventos === 1) {
        await manager.delete(Historial, { id });
        await manager.delete(Registro, { id: historial.registroOriginalId });
        return { eliminado: true, registroEliminado: true };
      }

      const registro = await manager.findOne(Registro, { where: { id: historial.registroOriginalId } });
      if (!registro) {
        throw new NotFoundException(
          `No se encontró el registro original #${historial.registroOriginalId} — no se puede revertir`,
        );
      }

      switch (historial.tipo) {
        case TipoEvento.RENOVACION:
          // periodoDesde de una RENOVACION guarda el checkout estimado
          // de ANTES de esa renovación (ver actualizarRenovar() en
          // registros.service.ts) — revertirlo es tan simple como
          // regresarlo ahí.
          registro.checkOutEstimado = historial.periodoDesde;
          break;
        case TipoEvento.CHECKOUT:
          registro.cerrado = false;
          registro.checkOutReal = null as unknown as Date;
          registro.otroCobroCheckout = 0;
          registro.multaTardio = 0;
          break;
        case TipoEvento.COBRO_EXTRA:
        case TipoEvento.CHECK_IN:
          break; // CHECK_IN no debería llegar aquí (siempre es el único evento cuando existe)
      }
      registro.totalACobrar = Number(registro.totalACobrar) - Number(historial.totalCobrado);
      await manager.save(registro);

      await manager.delete(Historial, { id });
      return { eliminado: true, registroEliminado: false };
    });
  }

  // Borra TODA una estadía de un tirón (Registro + todos sus
  // Historial/Ingreso), sin importar cuántos eventos tenga ni en qué
  // orden — a diferencia de eliminar(), no valida nada de negocio, es
  // la salida rápida para cuando todo un registro se hizo mal.
  async eliminarEstadia(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const historial = await manager.findOne(Historial, { where: { id } });
      if (!historial) throw new NotFoundException(`Historial ${id} no encontrado`);

      const { registroOriginalId } = historial;
      await manager.delete(Ingreso, { registro: { id: registroOriginalId } });
      await manager.delete(Historial, { registroOriginalId });
      await manager.delete(Registro, { id: registroOriginalId });

      return { eliminado: true, registroOriginalId };
    });
  }

  // Agrupa Ingreso por el Historial al que pertenece, para poder
  // mostrar el desglose real de métodos de pago de cada fila (ej. un
  // check-in pagado mitad efectivo mitad tarjeta) en vez de solo
  // `Historial.metodoPago`, que únicamente guarda el de la PRIMERA
  // línea de pago.
  private async agruparPagosPorHistorial(historialIds: number[]): Promise<Map<number, Ingreso[]>> {
    const mapa = new Map<number, Ingreso[]>();
    if (historialIds.length === 0) return mapa;

    const ingresos = await this.ingresoRepo.find({
      where: { historial: { id: In(historialIds) } },
      relations: { historial: true },
      order: { id: 'ASC' },
    });
    for (const ingreso of ingresos) {
      const lista = mapa.get(ingreso.historial.id) ?? [];
      lista.push(ingreso);
      mapa.set(ingreso.historial.id, lista);
    }
    return mapa;
  }

  // Agrega `pagos` (desglose por método/concepto) a cada fila, sin
  // tocar las columnas propias de Historial. Si una fila no tiene
  // ninguna línea de Ingreso asociada (datos viejos, de antes de que
  // existiera esta tabla), `pagos` queda vacío y el frontend cae de
  // regreso a `metodoPago`.
  private conPagos(fila: Historial, mapa: Map<number, Ingreso[]>) {
    const pagos = (mapa.get(fila.id) ?? []).map((i) => ({
      metodoPago: i.metodoPago,
      concepto: i.concepto,
      cantidad: Number(i.cantidad),
      nota: i.nota,
    }));
    return { ...fila, pagos };
  }

  // Paginado, más reciente primero. Se ordena también por `id` además
  // de `fechaEvento` (que ya se puede editar y puede repetirse entre
  // filas) para que el orden entre páginas sea estable.
  async findAll(page = 1, limit = 20) {
    const [filas, total] = await this.historialRepo.findAndCount({
      order: { fechaEvento: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const mapa = await this.agruparPagosPorHistorial(filas.map((f) => f.id));
    const data = filas.map((f) => this.conPagos(f, mapa));
    return { data, total, page, limit };
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

    // Mismo desglose de pagos que findAll(), para que la tabla del
    // corte de caja también muestre cada método de pago usado (no solo
    // el de la primera línea) en check-ins/renovaciones/checkouts que
    // se pagaron con varios métodos a la vez.
    const mapa = await this.agruparPagosPorHistorial(filas.map((f) => f.id));
    const filasConPagos = filas.map((f) => this.conPagos(f, mapa));

    return { desde, hasta, resumen: this.resumenDeIngresos(ingresos, filas), filas: filasConPagos };
  }
}

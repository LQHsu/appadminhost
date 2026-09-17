import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Registro, Renovar, MetodoPago } from './entities/registro.entity';
import { Habitacion } from '../habitaciones/entities/habitacion.entity';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { PagoDto } from './dto/pago.dto';
import { HabitacionesService } from '../habitaciones/habitaciones.service';
import { HistorialService } from '../historial/historial.service';
import { Historial, TipoEvento } from '../historial/entities/historial.entity';
import { Ingreso, ConceptoIngreso } from '../historial/entities/ingreso.entity';
import { medioDiaHostal, fechaYMDHostal } from '../common/zona-horaria';

export type Status = 'VIGENTE' | 'PENDIENTE' | 'RENOVADO' | 'NO';

@Injectable()
export class RegistrosService {
  constructor(
    @InjectRepository(Registro)
    private registrosRepo: Repository<Registro>,
    @InjectRepository(Habitacion)
    private habitacionesRepo: Repository<Habitacion>,
    private habitacionesService: HabitacionesService,
    private historialService: HistorialService,
    private dataSource: DataSource,
  ) {}

  // Reconcilia el DTO nuevo (`pagos`, varias líneas) con el viejo
  // (`metodoPago`, uno solo) mientras el frontend termina de migrar:
  // si mandan `pagos`, se usa tal cual (validando que sume el total);
  // si solo mandan el `metodoPago` de siempre, se arma una única línea
  // con el total completo. Si no mandan ninguno de los dos, es un
  // request inválido.
  private resolverPagos(pagos: PagoDto[] | undefined, metodoPago: MetodoPago | undefined, total: number): PagoDto[] {
    if (pagos && pagos.length > 0) {
      const suma = pagos.reduce((s, p) => s + p.cantidad, 0);
      if (Math.abs(suma - total) > 0.01) {
        throw new BadRequestException(
          `La suma de los pagos ($${suma.toFixed(2)}) no coincide con el total a cobrar ($${total.toFixed(2)})`,
        );
      }
      return pagos;
    }
    if (metodoPago) {
      return [{ metodoPago, cantidad: total }];
    }
    throw new BadRequestException('Debes indicar cómo se pagó (pagos o metodoPago)');
  }

  // Crea una fila de Ingreso por cada línea de pago, todas ligadas al
  // mismo evento de Historial y al mismo huésped.
  private async crearIngresos(
    manager: EntityManager,
    pagos: Array<{ metodoPago: MetodoPago; cantidad: number; nota?: string }>,
    concepto: ConceptoIngreso,
    historialId: number,
    registroId: number,
    fecha: Date,
  ) {
    for (const pago of pagos) {
      const ingreso = manager.create(Ingreso, {
        historial: { id: historialId } as Ingreso['historial'],
        registro: { id: registroId } as Ingreso['registro'],
        concepto,
        metodoPago: pago.metodoPago,
        cantidad: pago.cantidad,
        nota: pago.nota,
        fecha,
      });
      await manager.save(ingreso);
    }
  }

  // Traduce literalmente la fórmula de STATUS del Excel:
  // VIGENTE mientras no llega checkout, PENDIENTE si ya pasó y no hay
  // decisión de renovar, RENOVADO si renovar=SI, NO si renovar=NO.
  calcularStatus(registro: Registro): Status {
    const ahora = new Date();
    if (registro.renovar === Renovar.SI) return 'RENOVADO';
    if (registro.renovar === Renovar.NO) return 'NO';
    return ahora < registro.checkOutEstimado ? 'VIGENTE' : 'PENDIENTE';
  }

  // Independiente del status: ¿ya pasó la hora de checkout estimada
  // (12 pm) y el huésped sigue sin salir? Un "NO renovó" que ya pasó
  // las 12 sigue debiendo checkout igual que un PENDIENTE — decidir
  // no renovar no es lo mismo que ya haberse ido. Se usa para el
  // contador "deben hacer checkout" y para sugerir la multa por salida
  // tardía, sin pisar el status 'NO' (que sigue siendo información
  // útil por sí sola).
  esVencido(registro: Registro): boolean {
    return new Date() >= registro.checkOutEstimado;
  }

  private conStatus(registro: Registro) {
    return { ...registro, status: this.calcularStatus(registro), vencido: this.esVencido(registro) };
  }

  async create(dto: CreateRegistroDto) {
    // 1) valida que existan camas disponibles en esa habitación
    const habitacion = await this.habitacionesService.verificarDisponibilidad(
      dto.habitacionId,
      dto.camasSolicitadas,
    );

    // Por defecto "ahora" (el caso normal), pero se puede especificar
    // otra fecha/hora — ej. un huésped que ya llegó y se captura tarde.
    const checkIn = dto.checkIn ? new Date(dto.checkIn) : new Date();

    // Solo la FECHA de salida la elige quien registra; la hora siempre
    // se fija a las 12 pm HORA DEL HOSTAL (no la del servidor — ver
    // zona-horaria.ts). Así "pasadas las 12" sigue siendo un corte
    // único y predecible para todos: es cuando el status pasa a
    // PENDIENTE, las camas se liberan solas si ya se marcó "no
    // renovar", y desde cuándo aplicaría una multa por checkout tardío.
    const checkOutEstimado = medioDiaHostal(dto.checkOutFecha);

    if (checkOutEstimado <= checkIn) {
      throw new BadRequestException('La fecha de salida debe ser posterior al check-in');
    }

    // "Noches" ya no es un input: se calcula del periodo real
    // capturado (días de calendario que abarca, redondeado hacia
    // arriba), así el cobro siempre coincide con las fechas.
    const MS_POR_DIA = 1000 * 60 * 60 * 24;
    const noches = Math.max(1, Math.ceil((checkOutEstimado.getTime() - checkIn.getTime()) / MS_POR_DIA));

    const otroCobro = dto.otroCobro ?? 0;
    const totalACobrar = dto.camasSolicitadas * dto.costoPorCama * noches + otroCobro;
    const pagos = this.resolverPagos(dto.pagos, dto.metodoPago, totalACobrar);

    // El check-in y su línea de historial se guardan juntos: o se crea
    // el registro Y se refleja el cobro en el reporte diario, o no pasa
    // ninguna de las dos cosas.
    return this.dataSource.transaction(async (manager) => {
      const registro = manager.create(Registro, {
        nombreCliente: dto.nombreCliente,
        checkIn,
        camasSolicitadas: dto.camasSolicitadas,
        costoPorCama: dto.costoPorCama,
        noches,
        otroCobro,
        totalACobrar,
        checkOutEstimado,
        habitacion,
        documentoIdentidad: dto.documentoIdentidad,
        // "Método de pago" del registro queda como el de la PRIMERA
        // línea, solo para mostrar algo rápido en la lista — el
        // desglose real (si hubo varios métodos) vive en Ingreso.
        metodoPago: pagos[0].metodoPago,
        renovar: dto.renovar ?? Renovar.PENDIENTE,
        atendio: dto.atendio,
      });

      const guardado = await manager.save(registro);

      // Línea de historial CHECK_IN: fechaEvento = checkIn real (no el
      // momento en que se capturó el registro) — si se registra tarde
      // a alguien que ya llegó hace días, el reporte de ESE día se
      // actualiza retroactivamente para reflejarlo, en vez de contarlo
      // en el día de hoy.
      const historial = manager.create(Historial, {
        registroOriginalId: guardado.id,
        tipo: TipoEvento.CHECK_IN,
        fechaEvento: checkIn,
        periodoDesde: checkIn,
        periodoHasta: checkOutEstimado,
        nombreCliente: guardado.nombreCliente,
        checkIn,
        checkOut: null as unknown as Date,
        camas: guardado.camasSolicitadas,
        costoPorCama: guardado.costoPorCama,
        noches: guardado.noches,
        otroCobro: guardado.otroCobro,
        totalCobrado: totalACobrar,
        multa: 0,
        piso: habitacion.piso,
        habitacionNumero: habitacion.numero,
        documentoIdentidad: guardado.documentoIdentidad,
        metodoPago: guardado.metodoPago,
        renovarFinal: guardado.renovar,
        atendio: guardado.atendio,
      });
      const historialGuardado = await manager.save(historial);

      await this.crearIngresos(
        manager,
        pagos,
        ConceptoIngreso.HOSPEDAJE,
        historialGuardado.id,
        guardado.id,
        checkIn,
      );

      return this.conStatus(guardado);
    });
  }

  async findAll() {
    const registros = await this.registrosRepo.find({
      where: { cerrado: false },
      relations: { habitacion: true },
      order: { checkIn: 'DESC' },
    });
    return registros.map((r) => this.conStatus(r));
  }

  async findOne(id: number) {
    const registro = await this.registrosRepo.findOne({
      where: { id },
      relations: { habitacion: true },
    });
    if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);
    return this.conStatus(registro);
  }

  // Actualiza SOLO las "celdas amarillas" editables (ej. marcar renovar).
  // diasRenovacion: cuántos días quiere renovar el huésped. Si no se
  // manda (o es <= 0), cae de regreso a las noches originales del
  // registro (comportamiento anterior). pagos/metodoPago: cómo se pagó
  // la renovación — solo aplica cuando renovar === 'SI'.
  async actualizarRenovar(
    id: number,
    renovar: Renovar,
    diasRenovacion?: number,
    pagos?: PagoDto[],
    metodoPago?: MetodoPago,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const registro = await manager.findOne(Registro, {
        where: { id },
        relations: { habitacion: true },
      });
      if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);
      registro.renovar = renovar;
      // Si renueva, se recorre el checkout estimado los días indicados.
      if (renovar === Renovar.SI) {
        const dias = diasRenovacion && diasRenovacion > 0 ? diasRenovacion : registro.noches;
        const checkoutAnterior = registro.checkOutEstimado;
        // fechaYMDHostal usa la fecha del hostal (no la del servidor)
        // para saber qué día es "hoy + dias" antes de recalcular el
        // mediodía correcto — mismo fix que en create().
        const [anio, mes, dia] = fechaYMDHostal(checkoutAnterior).split('-').map(Number);
        const fechaBase = new Date(Date.UTC(anio, mes - 1, dia));
        fechaBase.setUTCDate(fechaBase.getUTCDate() + dias);
        const nuevoCheckout = medioDiaHostal(
          `${fechaBase.getUTCFullYear()}-${String(fechaBase.getUTCMonth() + 1).padStart(2, '0')}-${String(fechaBase.getUTCDate()).padStart(2, '0')}`,
        );
        const montoRenovacion = registro.camasSolicitadas * Number(registro.costoPorCama) * dias;
        const lineasPago = this.resolverPagos(pagos, metodoPago, montoRenovacion);

        registro.checkOutEstimado = nuevoCheckout;
        registro.totalACobrar = Number(registro.totalACobrar) + montoRenovacion;
        registro.renovar = Renovar.PENDIENTE; // vuelve a quedar VIGENTE con el nuevo periodo

        // Línea de historial RENOVACION: solo el cobro de los días
        // nuevos, fechada el día en que se hizo la renovación (no el
        // check-in original), y con el periodo que cubre (de cuándo
        // vencía antes a cuándo vence ahora).
        const ahora = new Date();
        const historial = manager.create(Historial, {
          registroOriginalId: registro.id,
          tipo: TipoEvento.RENOVACION,
          fechaEvento: ahora,
          periodoDesde: checkoutAnterior,
          periodoHasta: nuevoCheckout,
          nombreCliente: registro.nombreCliente,
          checkIn: registro.checkIn,
          checkOut: null as unknown as Date,
          camas: registro.camasSolicitadas,
          costoPorCama: registro.costoPorCama,
          noches: dias,
          otroCobro: 0,
          totalCobrado: montoRenovacion,
          multa: 0,
          piso: registro.habitacion.piso,
          habitacionNumero: registro.habitacion.numero,
          documentoIdentidad: registro.documentoIdentidad,
          metodoPago: lineasPago[0].metodoPago,
          renovarFinal: registro.renovar,
          atendio: registro.atendio,
        });
        const historialGuardado = await manager.save(historial);

        await this.crearIngresos(
          manager,
          lineasPago,
          ConceptoIngreso.HOSPEDAJE,
          historialGuardado.id,
          registro.id,
          ahora,
        );
      }
      const guardado = await manager.save(registro);
      return this.conStatus(guardado);
    });
  }

  // Equivalente al botón "CONFIRMAR REGISTRO" (macro VBA) que pediste:
  // cierra el registro y libera las camas, todo en una sola transacción
  // (o pasa completo, o no pasa nada) — esto es justo lo que Excel no
  // puede garantizar sin macros, y con base de datos es gratis.
  //
  // El cobro de la estadía en sí ya se registró antes (CHECK_IN y cada
  // RENOVACION); aquí solo se cobra lo que se decida a mano en el
  // momento de la salida: uno o varios cargos extra (cobrosExtra, ej.
  // minibar, daños) y/o una multa por checkout tardío (multaTardio, si
  // ya pasaron las 12 pm y el huésped no había salido). Todo opcional,
  // queda en 0/vacío si no se manda. Si no se especifica método de
  // pago para uno que sí tiene monto, se asume EFECTIVO (compatibilidad
  // con el frontend viejo, que no lo preguntaba).
  async checkout(
    id: number,
    cobrosExtra?: Array<{ metodoPago: MetodoPago; cantidad: number; nota?: string }>,
    otroCobroCheckout = 0,
    otroCobroCheckoutMetodoPago?: MetodoPago,
    multaTardio = 0,
    multaTardioMetodoPago?: MetodoPago,
  ) {
    // Compatibilidad hacia atrás: si no mandan `cobrosExtra` pero sí el
    // viejo `otroCobroCheckout`, se arma una sola línea con eso.
    const listaCobrosExtra =
      cobrosExtra && cobrosExtra.length > 0
        ? cobrosExtra
        : otroCobroCheckout > 0
          ? [{ metodoPago: otroCobroCheckoutMetodoPago ?? MetodoPago.EFECTIVO, cantidad: otroCobroCheckout }]
          : [];
    const totalCobrosExtra = listaCobrosExtra.reduce((s, c) => s + c.cantidad, 0);

    return this.dataSource.transaction(async (manager) => {
      const registro = await manager.findOne(Registro, {
        where: { id },
        relations: { habitacion: true },
      });
      if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);

      const checkOutReal = new Date();
      const totalExtra = totalCobrosExtra + multaTardio;

      const historial = manager.create(Historial, {
        registroOriginalId: registro.id,
        tipo: TipoEvento.CHECKOUT,
        fechaEvento: checkOutReal,
        periodoDesde: registro.checkOutEstimado,
        periodoHasta: checkOutReal,
        nombreCliente: registro.nombreCliente,
        checkIn: registro.checkIn,
        checkOut: checkOutReal,
        camas: registro.camasSolicitadas,
        costoPorCama: registro.costoPorCama,
        noches: registro.noches,
        otroCobro: totalCobrosExtra,
        totalCobrado: totalExtra,
        multa: multaTardio,
        piso: registro.habitacion.piso,
        habitacionNumero: registro.habitacion.numero,
        documentoIdentidad: registro.documentoIdentidad,
        metodoPago: listaCobrosExtra[0]?.metodoPago ?? multaTardioMetodoPago ?? registro.metodoPago,
        renovarFinal: registro.renovar,
        atendio: registro.atendio,
      });
      const historialGuardado = await manager.save(historial);

      if (listaCobrosExtra.length > 0) {
        await this.crearIngresos(
          manager,
          listaCobrosExtra,
          ConceptoIngreso.COBRO_EXTRA,
          historialGuardado.id,
          registro.id,
          checkOutReal,
        );
      }
      if (multaTardio > 0) {
        await this.crearIngresos(
          manager,
          [{ metodoPago: multaTardioMetodoPago ?? MetodoPago.EFECTIVO, cantidad: multaTardio }],
          ConceptoIngreso.MULTA,
          historialGuardado.id,
          registro.id,
          checkOutReal,
        );
      }

      registro.otroCobroCheckout = totalCobrosExtra;
      registro.multaTardio = multaTardio;
      registro.totalACobrar = Number(registro.totalACobrar) + totalExtra;
      registro.cerrado = true;
      registro.checkOutReal = checkOutReal;
      await manager.save(registro);

      return { message: 'Registro movido a historial', registroId: id };
    });
  }
}

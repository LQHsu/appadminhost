import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Registro, Renovar } from './entities/registro.entity';
import { Habitacion } from '../habitaciones/entities/habitacion.entity';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { HabitacionesService } from '../habitaciones/habitaciones.service';
import { HistorialService } from '../historial/historial.service';
import { TipoEvento } from '../historial/entities/historial.entity';

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

    const checkIn = new Date(); // se congela aquí, como en el Excel
    const checkOutEstimado = new Date(checkIn);
    checkOutEstimado.setDate(checkOutEstimado.getDate() + dto.noches);
    // El checkout estimado siempre cae a las 12 pm del día que
    // corresponda, sin importar a qué hora se hizo el check-in. Así
    // "pasadas las 12" es un corte único y predecible para todos: es
    // cuando el status pasa a PENDIENTE, las camas se liberan solas si
    // ya se marcó "no renovar", y desde cuándo aplicaría una multa por
    // checkout tardío.
    checkOutEstimado.setHours(12, 0, 0, 0);

    const otroCobro = dto.otroCobro ?? 0;
    const totalACobrar =
      dto.camasSolicitadas * dto.costoPorCama * dto.noches + otroCobro;

    // El check-in y su línea de historial se guardan juntos: o se crea
    // el registro Y se refleja el cobro en el reporte diario, o no pasa
    // ninguna de las dos cosas.
    return this.dataSource.transaction(async (manager) => {
      const registro = manager.create(Registro, {
        nombreCliente: dto.nombreCliente,
        camasSolicitadas: dto.camasSolicitadas,
        costoPorCama: dto.costoPorCama,
        noches: dto.noches,
        otroCobro,
        totalACobrar,
        checkOutEstimado,
        habitacion,
        documentoIdentidad: dto.documentoIdentidad,
        metodoPago: dto.metodoPago,
        renovar: dto.renovar ?? Renovar.PENDIENTE,
        atendio: dto.atendio,
      });

      const guardado = await manager.save(registro);

      // Línea de historial CHECK_IN: refleja el cobro inicial el día
      // que realmente se hizo, no hasta que el huésped se vaya.
      const historial = manager.create('Historial', {
        registroOriginalId: guardado.id,
        tipo: TipoEvento.CHECK_IN,
        fechaEvento: checkIn,
        periodoDesde: checkIn,
        periodoHasta: checkOutEstimado,
        nombreCliente: guardado.nombreCliente,
        checkIn,
        checkOut: null,
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
      await manager.save(historial);

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
  // registro (comportamiento anterior).
  async actualizarRenovar(id: number, renovar: Renovar, diasRenovacion?: number) {
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
        const nuevoCheckout = new Date(checkoutAnterior);
        nuevoCheckout.setDate(nuevoCheckout.getDate() + dias);
        nuevoCheckout.setHours(12, 0, 0, 0); // igual que en create(): siempre a las 12 pm
        const montoRenovacion = registro.camasSolicitadas * Number(registro.costoPorCama) * dias;

        registro.checkOutEstimado = nuevoCheckout;
        registro.totalACobrar = Number(registro.totalACobrar) + montoRenovacion;
        registro.renovar = Renovar.PENDIENTE; // vuelve a quedar VIGENTE con el nuevo periodo

        // Línea de historial RENOVACION: solo el cobro de los días
        // nuevos, fechada el día en que se hizo la renovación (no el
        // check-in original), y con el periodo que cubre (de cuándo
        // vencía antes a cuándo vence ahora).
        const ahora = new Date();
        const historial = manager.create('Historial', {
          registroOriginalId: registro.id,
          tipo: TipoEvento.RENOVACION,
          fechaEvento: ahora,
          periodoDesde: checkoutAnterior,
          periodoHasta: nuevoCheckout,
          nombreCliente: registro.nombreCliente,
          checkIn: registro.checkIn,
          checkOut: null,
          camas: registro.camasSolicitadas,
          costoPorCama: registro.costoPorCama,
          noches: dias,
          otroCobro: 0,
          totalCobrado: montoRenovacion,
          multa: 0,
          piso: registro.habitacion.piso,
          habitacionNumero: registro.habitacion.numero,
          documentoIdentidad: registro.documentoIdentidad,
          metodoPago: registro.metodoPago,
          renovarFinal: registro.renovar,
          atendio: registro.atendio,
        });
        await manager.save(historial);
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
  // momento de la salida: un cargo extra (otroCobroCheckout, ej. daños
  // o consumo) y/o una multa por checkout tardío (multaTardio, si ya
  // pasaron las 12 pm y el huésped no había salido). Ambos son
  // opcionales y quedan en 0 si no se mandan.
  async checkout(id: number, otroCobroCheckout = 0, multaTardio = 0) {
    return this.dataSource.transaction(async (manager) => {
      const registro = await manager.findOne(Registro, {
        where: { id },
        relations: { habitacion: true },
      });
      if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);

      const checkOutReal = new Date();
      const totalExtra = otroCobroCheckout + multaTardio;

      const historial = manager.create('Historial', {
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
        otroCobro: otroCobroCheckout,
        totalCobrado: totalExtra,
        multa: multaTardio,
        piso: registro.habitacion.piso,
        habitacionNumero: registro.habitacion.numero,
        documentoIdentidad: registro.documentoIdentidad,
        metodoPago: registro.metodoPago,
        renovarFinal: registro.renovar,
        atendio: registro.atendio,
      });
      await manager.save(historial);

      registro.otroCobroCheckout = otroCobroCheckout;
      registro.multaTardio = multaTardio;
      registro.totalACobrar = Number(registro.totalACobrar) + totalExtra;
      registro.cerrado = true;
      registro.checkOutReal = checkOutReal;
      await manager.save(registro);

      return { message: 'Registro movido a historial', registroId: id };
    });
  }
}

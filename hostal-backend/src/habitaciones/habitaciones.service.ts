import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Habitacion } from './entities/habitacion.entity';
import { Registro, Renovar } from '../registros/entities/registro.entity';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';

@Injectable()
export class HabitacionesService {
  constructor(
    @InjectRepository(Habitacion)
    private habitacionesRepo: Repository<Habitacion>,
    @InjectRepository(Registro)
    private registrosRepo: Repository<Registro>,
  ) {}

  async create(dto: CreateHabitacionDto) {
    const habitacion = this.habitacionesRepo.create(dto);
    try {
      return await this.habitacionesRepo.save(habitacion);
    } catch (err) {
      throw this.traducirErrorNumeroDuplicado(err, dto.numero);
    }
  }

  // Por piso y luego por número, no por id de creación — así la lista
  // queda ordenada como el hostal físico, sin importar en qué orden
  // se dieron de alta. numero es texto libre (no siempre numérico:
  // "CT-1", "P3-1"...), así que el orden dentro de un piso es
  // alfabético, no siempre 1,2,3... en ese sentido.
  findAll() {
    return this.habitacionesRepo.find({ order: { piso: 'ASC', numero: 'ASC' } });
  }

  async findOne(id: number) {
    const habitacion = await this.habitacionesRepo.findOne({ where: { id } });
    if (!habitacion) {
      throw new NotFoundException(`Habitación ${id} no encontrada`);
    }
    return habitacion;
  }

  // Editar piso/número/camas totales — por si se dieron de alta mal o
  // cambia la distribución real del hostal. Si se reduce camasTotales,
  // no se puede dejar por debajo de lo que ya está ocupado ahora mismo
  // (dejaría camasDisponibles en negativo).
  async update(id: number, dto: UpdateHabitacionDto) {
    const habitacion = await this.findOne(id);

    if (dto.camasTotales !== undefined && dto.camasTotales < habitacion.camasTotales) {
      const ocupadas = await this.camasOcupadas(id);
      if (dto.camasTotales < ocupadas) {
        throw new BadRequestException(
          `No se puede bajar a ${dto.camasTotales} camas — hay ${ocupadas} ocupada(s) ahora mismo en esta habitación.`,
        );
      }
    }

    Object.assign(habitacion, dto);
    try {
      return await this.habitacionesRepo.save(habitacion);
    } catch (err) {
      throw this.traducirErrorNumeroDuplicado(err, dto.numero);
    }
  }

  // El "numero" de habitación es único (constraint de la base) — si
  // alguien intenta dejarlo igual al de otra habitación, Postgres/
  // sqlite tiran un error de bajo nivel poco claro; esto lo traduce a
  // un mensaje que tiene sentido para quien está usando el formulario.
  private traducirErrorNumeroDuplicado(err: unknown, numero?: string) {
    if (err instanceof QueryFailedError) {
      return new ConflictException(`Ya existe una habitación con el número "${numero}"`);
    }
    return err;
  }

  // Camas ocupadas = suma de camasSolicitadas de registros abiertos
  // (no cerrados) cuyo status efectivo es VIGENTE o RENOVADO.
  // Esto reemplaza la fórmula de "CAMAS DISPONIBLES" del Excel.
  async camasOcupadas(habitacionId: number): Promise<number> {
    const registrosActivos = await this.registrosRepo.find({
      where: { habitacion: { id: habitacionId }, cerrado: false },
    });
    const ahora = new Date();
    return registrosActivos
      .filter((r) => {
        const vigente = ahora < r.checkOutEstimado;
        return vigente || r.renovar === Renovar.SI;
      })
      .reduce((sum, r) => sum + r.camasSolicitadas, 0);
  }

  // Equivalente a la hoja "DISPONIBILIDAD": por cada habitación,
  // camas totales / ocupadas / disponibles, calculado en tiempo real.
  async disponibilidad() {
    const habitaciones = await this.findAll();
    return Promise.all(
      habitaciones.map(async (h) => {
        const ocupadas = await this.camasOcupadas(h.id);
        return {
          id: h.id,
          piso: h.piso,
          numero: h.numero,
          camasTotales: h.camasTotales,
          camasOcupadas: ocupadas,
          camasDisponibles: h.camasTotales - ocupadas,
        };
      }),
    );
  }

  async verificarDisponibilidad(habitacionId: number, camasSolicitadas: number) {
    const habitacion = await this.findOne(habitacionId);
    const ocupadas = await this.camasOcupadas(habitacionId);
    const disponibles = habitacion.camasTotales - ocupadas;
    if (camasSolicitadas > disponibles) {
      throw new BadRequestException(
        `Solo hay ${disponibles} cama(s) disponible(s) en la habitación ${habitacion.numero}`,
      );
    }
    return habitacion;
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Habitacion } from './entities/habitacion.entity';
import { Registro, Renovar } from '../registros/entities/registro.entity';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';

@Injectable()
export class HabitacionesService {
  constructor(
    @InjectRepository(Habitacion)
    private habitacionesRepo: Repository<Habitacion>,
    @InjectRepository(Registro)
    private registrosRepo: Repository<Registro>,
  ) {}

  create(dto: CreateHabitacionDto) {
    const habitacion = this.habitacionesRepo.create(dto);
    return this.habitacionesRepo.save(habitacion);
  }

  findAll() {
    return this.habitacionesRepo.find();
  }

  async findOne(id: number) {
    const habitacion = await this.habitacionesRepo.findOne({ where: { id } });
    if (!habitacion) {
      throw new NotFoundException(`Habitación ${id} no encontrada`);
    }
    return habitacion;
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
    const habitaciones = await this.habitacionesRepo.find();
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

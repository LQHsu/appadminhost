import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CanalVenta } from './entities/canal-venta.entity';
import { CreateCanalVentaDto } from './dto/create-canal-venta.dto';
import { UpdateCanalVentaDto } from './dto/update-canal-venta.dto';

@Injectable()
export class CanalesVentaService {
  constructor(
    @InjectRepository(CanalVenta)
    private canalesVentaRepo: Repository<CanalVenta>,
  ) {}

  async create(dto: CreateCanalVentaDto) {
    const canal = this.canalesVentaRepo.create(dto);
    try {
      return await this.canalesVentaRepo.save(canal);
    } catch (err) {
      throw this.traducirErrorDuplicado(err, dto.nombre);
    }
  }

  findAll() {
    return this.canalesVentaRepo.find({ order: { nombre: 'ASC' } });
  }

  async update(id: number, dto: UpdateCanalVentaDto) {
    const canal = await this.canalesVentaRepo.findOneBy({ id });
    if (!canal) throw new NotFoundException(`Canal de venta ${id} no encontrado`);
    Object.assign(canal, dto);
    try {
      return await this.canalesVentaRepo.save(canal);
    } catch (err) {
      throw this.traducirErrorDuplicado(err, dto.nombre);
    }
  }

  private traducirErrorDuplicado(err: unknown, nombre?: string) {
    if (err instanceof QueryFailedError) {
      return new ConflictException(`Ya existe un canal de venta llamado "${nombre}"`);
    }
    return err;
  }
}

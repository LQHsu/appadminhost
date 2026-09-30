import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ConceptoExtra } from './entities/concepto-extra.entity';
import { CreateConceptoExtraDto } from './dto/create-concepto-extra.dto';
import { UpdateConceptoExtraDto } from './dto/update-concepto-extra.dto';

@Injectable()
export class ConceptosExtraService {
  constructor(
    @InjectRepository(ConceptoExtra)
    private conceptosExtraRepo: Repository<ConceptoExtra>,
  ) {}

  async create(dto: CreateConceptoExtraDto) {
    const concepto = this.conceptosExtraRepo.create(dto);
    try {
      return await this.conceptosExtraRepo.save(concepto);
    } catch (err) {
      throw this.traducirErrorDuplicado(err, dto.nombre);
    }
  }

  findAll() {
    return this.conceptosExtraRepo.find({ order: { nombre: 'ASC' } });
  }

  async update(id: number, dto: UpdateConceptoExtraDto) {
    const concepto = await this.conceptosExtraRepo.findOneBy({ id });
    if (!concepto) throw new NotFoundException(`Concepto extra ${id} no encontrado`);
    Object.assign(concepto, dto);
    try {
      return await this.conceptosExtraRepo.save(concepto);
    } catch (err) {
      throw this.traducirErrorDuplicado(err, dto.nombre);
    }
  }

  private traducirErrorDuplicado(err: unknown, nombre?: string) {
    if (err instanceof QueryFailedError) {
      return new ConflictException(`Ya existe un concepto extra llamado "${nombre}"`);
    }
    return err;
  }
}

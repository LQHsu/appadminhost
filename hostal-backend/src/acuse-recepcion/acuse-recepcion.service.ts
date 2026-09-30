import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcuseRecepcion } from './entities/acuse-recepcion.entity';
import { CreateAcuseRecepcionDto } from './dto/create-acuse-recepcion.dto';
import { medianocheHostal, UN_DIA_MS } from '../common/zona-horaria';

@Injectable()
export class AcuseRecepcionService {
  constructor(
    @InjectRepository(AcuseRecepcion)
    private acuseRecepcionRepo: Repository<AcuseRecepcion>,
  ) {}

  create(dto: CreateAcuseRecepcionDto) {
    const acuse = this.acuseRecepcionRepo.create({
      desde: medianocheHostal(dto.desde),
      hasta: new Date(medianocheHostal(dto.hasta).getTime() + UN_DIA_MS),
      documentosEntregados: dto.documentosEntregados,
      fechaRecepcion: medianocheHostal(dto.fechaRecepcion),
      firmaRecibio: dto.firmaRecibio,
      comentarios: dto.comentarios,
    });
    return this.acuseRecepcionRepo.save(acuse);
  }

  // Coincidencia exacta contra el rango que se está viendo (mismo
  // criterio que CorteCajaService.findAll).
  findAll(desde?: Date, hasta?: Date) {
    return this.acuseRecepcionRepo.find({
      where: desde && hasta ? { desde, hasta } : {},
      order: { creadoEn: 'DESC' },
    });
  }
}

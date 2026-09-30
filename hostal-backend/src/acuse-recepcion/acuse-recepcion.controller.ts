import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { AcuseRecepcionService } from './acuse-recepcion.service';
import { CreateAcuseRecepcionDto } from './dto/create-acuse-recepcion.dto';
import { medianocheHostal, UN_DIA_MS } from '../common/zona-horaria';

@Controller('acuses-recepcion')
export class AcuseRecepcionController {
  constructor(private readonly acuseRecepcionService: AcuseRecepcionService) {}

  @Post()
  create(@Body() dto: CreateAcuseRecepcionDto) {
    return this.acuseRecepcionService.create(dto);
  }

  @Get()
  findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    if (!desde && !hasta) return this.acuseRecepcionService.findAll();
    if (!desde || !hasta) {
      throw new BadRequestException('Manda desde y hasta juntos, o ninguno');
    }
    const inicio = medianocheHostal(desde);
    const finExclusivo = medianocheHostal(hasta);
    if (isNaN(inicio.getTime()) || isNaN(finExclusivo.getTime())) {
      throw new BadRequestException('desde/hasta deben ser fechas válidas (YYYY-MM-DD)');
    }
    return this.acuseRecepcionService.findAll(inicio, new Date(finExclusivo.getTime() + UN_DIA_MS));
  }
}

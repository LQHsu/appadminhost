import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { CorteCajaService } from './corte-caja.service';
import { CreateCorteCajaDto } from './dto/create-corte-caja.dto';
import { medianocheHostal, UN_DIA_MS } from '../common/zona-horaria';

@Controller('cortes-caja')
export class CorteCajaController {
  constructor(private readonly corteCajaService: CorteCajaService) {}

  @Post()
  create(@Body() dto: CreateCorteCajaDto) {
    return this.corteCajaService.create(dto);
  }

  // Sin desde/hasta, regresa todos los cortes guardados (orden más
  // reciente primero). Con ambos, solo los que se hicieron para
  // exactamente ese rango — mismo desde/hasta que el Reporte Diario.
  @Get()
  findAll(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    if (!desde && !hasta) return this.corteCajaService.findAll();
    if (!desde || !hasta) {
      throw new BadRequestException('Manda desde y hasta juntos, o ninguno');
    }
    const inicio = medianocheHostal(desde);
    const finExclusivo = medianocheHostal(hasta);
    if (isNaN(inicio.getTime()) || isNaN(finExclusivo.getTime())) {
      throw new BadRequestException('desde/hasta deben ser fechas válidas (YYYY-MM-DD)');
    }
    return this.corteCajaService.findAll(inicio, new Date(finExclusivo.getTime() + UN_DIA_MS));
  }
}

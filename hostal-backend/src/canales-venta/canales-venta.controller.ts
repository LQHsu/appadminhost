import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CanalesVentaService } from './canales-venta.service';
import { CreateCanalVentaDto } from './dto/create-canal-venta.dto';
import { UpdateCanalVentaDto } from './dto/update-canal-venta.dto';

@Controller('canales-venta')
export class CanalesVentaController {
  constructor(private readonly canalesVentaService: CanalesVentaService) {}

  @Get()
  findAll() {
    return this.canalesVentaService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCanalVentaDto) {
    return this.canalesVentaService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCanalVentaDto) {
    return this.canalesVentaService.update(id, dto);
  }
}

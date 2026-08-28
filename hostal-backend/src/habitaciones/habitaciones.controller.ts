import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';

@Controller('habitaciones')
export class HabitacionesController {
  constructor(private readonly habitacionesService: HabitacionesService) {}

  @Post()
  create(@Body() dto: CreateHabitacionDto) {
    return this.habitacionesService.create(dto);
  }

  @Get()
  findAll() {
    return this.habitacionesService.findAll();
  }

  // Equivalente a la hoja "DISPONIBILIDAD" del Excel.
  @Get('disponibilidad')
  disponibilidad() {
    return this.habitacionesService.disponibilidad();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.habitacionesService.findOne(id);
  }
}

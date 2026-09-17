import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { HabitacionesService } from './habitaciones.service';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';

@Controller('habitaciones')
export class HabitacionesController {
  constructor(private readonly habitacionesService: HabitacionesService) {}

  @Post()
  create(@Body() dto: CreateHabitacionDto) {
    return this.habitacionesService.create(dto);
  }

  // Editar piso/número/camas totales de una habitación ya existente.
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHabitacionDto) {
    return this.habitacionesService.update(id, dto);
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

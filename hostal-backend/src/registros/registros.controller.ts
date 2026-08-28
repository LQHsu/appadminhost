import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { RegistrosService } from './registros.service';
import { CreateRegistroDto } from './dto/create-registro.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { Renovar } from './entities/registro.entity';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  // Equivalente a llenar una fila nueva en la hoja REGISTRO.
  @Post()
  create(@Body() dto: CreateRegistroDto) {
    return this.registrosService.create(dto);
  }

  // Equivalente a ver la hoja REGISTRO completa (solo los abiertos).
  @Get()
  findAll() {
    return this.registrosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.registrosService.findOne(id);
  }

  // Marcar la columna "Renovar" (SI/NO). diasRenovacion es opcional:
  // solo aplica cuando renovar === 'SI'.
  @Patch(':id/renovar')
  actualizarRenovar(
    @Param('id', ParseIntPipe) id: number,
    @Body('renovar') renovar: Renovar,
    @Body('diasRenovacion') diasRenovacion?: number,
  ) {
    return this.registrosService.actualizarRenovar(id, renovar, diasRenovacion);
  }

  // Equivalente al botón "CONFIRMAR REGISTRO" (macro VBA): mueve el
  // registro a Historial y libera las camas. Body opcional para cargos
  // decididos a mano al momento de la salida (extra/multa tardía).
  @Post(':id/checkout')
  checkout(@Param('id', ParseIntPipe) id: number, @Body() dto: CheckoutDto) {
    return this.registrosService.checkout(id, dto.otroCobroCheckout, dto.multaTardio);
  }
}

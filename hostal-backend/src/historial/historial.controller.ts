import { Controller, Get, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards, BadRequestException } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { UpdateHistorialDto } from './dto/update-historial.dto';
import { EditPasswordGuard } from '../common/edit-password.guard';
import { medianocheHostal, UN_DIA_MS } from '../common/zona-horaria';

@Controller('historial')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get()
  findAll() {
    return this.historialService.findAll();
  }

  // Corrige una fila ya guardada (monto, pago, nombre, fecha) — pedida
  // porque el personal a veces captura mal los datos. Protegido con una
  // segunda clave (x-edit-password), separada de x-api-key.
  @Patch(':id')
  @UseGuards(EditPasswordGuard)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHistorialDto) {
    return this.historialService.actualizar(id, dto);
  }

  // Borra TODA la estadía a la que pertenece esta fila (Registro +
  // todos sus Historial/Ingreso), sin restricción de orden — ver
  // historial.service.ts.
  @Delete(':id/estadia')
  @UseGuards(EditPasswordGuard)
  eliminarEstadia(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.eliminarEstadia(id);
  }

  // Borra solo esta fila — únicamente si es el evento MÁS RECIENTE de
  // su estadía, revirtiendo lo que ese evento le había hecho al
  // Registro. Ver historial.service.ts para el detalle.
  @Delete(':id')
  @UseGuards(EditPasswordGuard)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.eliminar(id);
  }

  // Ej: GET /historial/reporte-mensual?anio=2026&mes=8
  @Get('reporte-mensual')
  reporteMensual(
    @Query('anio', ParseIntPipe) anio: number,
    @Query('mes', ParseIntPipe) mes: number,
  ) {
    return this.historialService.reporteMensual(anio, mes);
  }

  // Ej: GET /historial/reporte-anual?anio=2026
  @Get('reporte-anual')
  reporteAnual(@Query('anio', ParseIntPipe) anio: number) {
    return this.historialService.reporteAnual(anio);
  }

  // Ej: GET /historial/reporte-diario?desde=2026-08-01&hasta=2026-08-27
  // (rango de fechas, un solo día es un rango donde desde === hasta;
  // "hasta" se toma como día completo, incluyendo todo lo cobrado ese día).
  @Get('reporte-diario')
  reporteDiario(@Query('desde') desde: string, @Query('hasta') hasta: string) {
    // medianocheHostal (no `new Date(...)` a secas) es lo que hace que
    // el rango cubra el día completo EN HORA DEL HOSTAL — antes se
    // interpretaba en la hora del servidor (UTC en Render), desfasando
    // la ventana 6 horas y "perdiendo" o "corriendo" movimientos cerca
    // de la medianoche hacia el día siguiente.
    const inicio = medianocheHostal(desde);
    const finExclusivo = medianocheHostal(hasta);
    if (isNaN(inicio.getTime()) || isNaN(finExclusivo.getTime())) {
      throw new BadRequestException('desde/hasta deben ser fechas válidas (YYYY-MM-DD)');
    }

    return this.historialService.reporteDiario(inicio, new Date(finExclusivo.getTime() + UN_DIA_MS));
  }
}

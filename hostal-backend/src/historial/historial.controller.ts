import { Controller, Get, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { HistorialService } from './historial.service';

@Controller('historial')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get()
  findAll() {
    return this.historialService.findAll();
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
    const inicio = new Date(`${desde}T00:00:00`);
    const finExclusivo = new Date(`${hasta}T00:00:00`);
    if (isNaN(inicio.getTime()) || isNaN(finExclusivo.getTime())) {
      throw new BadRequestException('desde/hasta deben ser fechas válidas (YYYY-MM-DD)');
    }
    finExclusivo.setDate(finExclusivo.getDate() + 1); // fin de día inclusive

    return this.historialService.reporteDiario(inicio, finExclusivo);
  }
}

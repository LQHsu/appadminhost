import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorteCaja } from './entities/corte-caja.entity';
import { CreateCorteCajaDto } from './dto/create-corte-caja.dto';
import { HistorialService } from '../historial/historial.service';
import { medianocheHostal, UN_DIA_MS } from '../common/zona-horaria';

@Injectable()
export class CorteCajaService {
  constructor(
    @InjectRepository(CorteCaja)
    private corteCajaRepo: Repository<CorteCaja>,
    private historialService: HistorialService,
  ) {}

  async create(dto: CreateCorteCajaDto) {
    const desde = medianocheHostal(dto.desde);
    const hasta = new Date(medianocheHostal(dto.hasta).getTime() + UN_DIA_MS);

    // Se recalcula en vivo, no se confía en nada que mande el cliente
    // sobre cuánto dice el sistema — así un corte no puede "inventar"
    // una diferencia.
    const { resumen } = await this.historialService.reporteDiario(desde, hasta);

    const efectivoContado = dto.denominaciones.reduce((s, d) => s + d.valor * d.cantidad, 0);

    const corte = this.corteCajaRepo.create({
      desde,
      hasta,
      denominaciones: dto.denominaciones,
      efectivoContado,
      efectivoSistema: resumen.efectivo,
      diferenciaEfectivo: efectivoContado - resumen.efectivo,
      reporteTerminal: dto.reporteTerminal,
      tarjetaSistema: resumen.tarjeta,
      diferenciaTarjeta: dto.reporteTerminal !== undefined ? dto.reporteTerminal - resumen.tarjeta : undefined,
      entregadoPor: dto.entregadoPor,
      entregadoA: dto.entregadoA,
      comentarios: dto.comentarios,
    });

    return this.corteCajaRepo.save(corte);
  }

  // Coincidencia exacta contra el rango que se está viendo en el
  // Reporte Diario (no un overlap) — "¿ya hay un corte guardado para
  // EXACTAMENTE este desde/hasta?", no "cuál sea que lo toque".
  findAll(desde?: Date, hasta?: Date) {
    return this.corteCajaRepo.find({
      where: desde && hasta ? { desde, hasta } : {},
      order: { creadoEn: 'DESC' },
    });
  }
}

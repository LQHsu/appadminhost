import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';
import { Historial } from './entities/historial.entity';
import { Ingreso } from './entities/ingreso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Historial, Ingreso])],
  providers: [HistorialService],
  controllers: [HistorialController],
  exports: [HistorialService],
})
export class HistorialModule {}

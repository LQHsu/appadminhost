import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorteCajaService } from './corte-caja.service';
import { CorteCajaController } from './corte-caja.controller';
import { CorteCaja } from './entities/corte-caja.entity';
import { HistorialModule } from '../historial/historial.module';

@Module({
  imports: [TypeOrmModule.forFeature([CorteCaja]), HistorialModule],
  providers: [CorteCajaService],
  controllers: [CorteCajaController],
})
export class CorteCajaModule {}

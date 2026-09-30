import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalesVentaService } from './canales-venta.service';
import { CanalesVentaController } from './canales-venta.controller';
import { CanalVenta } from './entities/canal-venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CanalVenta])],
  providers: [CanalesVentaService],
  controllers: [CanalesVentaController],
  exports: [CanalesVentaService],
})
export class CanalesVentaModule {}

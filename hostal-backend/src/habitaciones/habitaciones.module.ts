import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitacionesService } from './habitaciones.service';
import { HabitacionesController } from './habitaciones.controller';
import { Habitacion } from './entities/habitacion.entity';
import { Registro } from '../registros/entities/registro.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Habitacion, Registro])],
  providers: [HabitacionesService],
  controllers: [HabitacionesController],
  exports: [HabitacionesService],
})
export class HabitacionesModule {}

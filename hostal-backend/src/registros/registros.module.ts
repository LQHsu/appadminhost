import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrosService } from './registros.service';
import { RegistrosController } from './registros.controller';
import { Registro } from './entities/registro.entity';
import { Habitacion } from '../habitaciones/entities/habitacion.entity';
import { HistorialModule } from '../historial/historial.module';
import { HabitacionesModule } from '../habitaciones/habitaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registro, Habitacion]),
    HistorialModule,
    HabitacionesModule,
  ],
  providers: [RegistrosService],
  controllers: [RegistrosController],
})
export class RegistrosModule {}

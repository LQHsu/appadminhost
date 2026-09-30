import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcuseRecepcionService } from './acuse-recepcion.service';
import { AcuseRecepcionController } from './acuse-recepcion.controller';
import { AcuseRecepcion } from './entities/acuse-recepcion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcuseRecepcion])],
  providers: [AcuseRecepcionService],
  controllers: [AcuseRecepcionController],
})
export class AcuseRecepcionModule {}

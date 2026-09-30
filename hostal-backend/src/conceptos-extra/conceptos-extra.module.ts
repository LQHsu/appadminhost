import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConceptosExtraService } from './conceptos-extra.service';
import { ConceptosExtraController } from './conceptos-extra.controller';
import { ConceptoExtra } from './entities/concepto-extra.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConceptoExtra])],
  providers: [ConceptosExtraService],
  controllers: [ConceptosExtraController],
  exports: [ConceptosExtraService],
})
export class ConceptosExtraModule {}

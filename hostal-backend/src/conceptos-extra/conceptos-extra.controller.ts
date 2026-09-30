import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ConceptosExtraService } from './conceptos-extra.service';
import { CreateConceptoExtraDto } from './dto/create-concepto-extra.dto';
import { UpdateConceptoExtraDto } from './dto/update-concepto-extra.dto';

@Controller('conceptos-extra')
export class ConceptosExtraController {
  constructor(private readonly conceptosExtraService: ConceptosExtraService) {}

  @Get()
  findAll() {
    return this.conceptosExtraService.findAll();
  }

  @Post()
  create(@Body() dto: CreateConceptoExtraDto) {
    return this.conceptosExtraService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConceptoExtraDto) {
    return this.conceptosExtraService.update(id, dto);
  }
}

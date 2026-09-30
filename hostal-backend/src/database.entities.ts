import { Habitacion } from './habitaciones/entities/habitacion.entity';
import { Registro } from './registros/entities/registro.entity';
import { Historial } from './historial/entities/historial.entity';
import { Ingreso } from './historial/entities/ingreso.entity';
import { CanalVenta } from './canales-venta/entities/canal-venta.entity';
import { ConceptoExtra } from './conceptos-extra/entities/concepto-extra.entity';
import { CorteCaja } from './corte-caja/entities/corte-caja.entity';
import { AcuseRecepcion } from './acuse-recepcion/entities/acuse-recepcion.entity';

// Lista única de entidades, compartida entre la conexión de Nest
// (app.module.ts) y la conexión standalone que usa el CLI de TypeORM
// para generar/correr migraciones (data-source.ts) — así nunca se
// desincronizan.
export const ENTIDADES = [
  Habitacion,
  Registro,
  Historial,
  Ingreso,
  CanalVenta,
  ConceptoExtra,
  CorteCaja,
  AcuseRecepcion,
];

import { Habitacion } from './habitaciones/entities/habitacion.entity';
import { Registro } from './registros/entities/registro.entity';
import { Historial } from './historial/entities/historial.entity';

// Lista única de entidades, compartida entre la conexión de Nest
// (app.module.ts) y la conexión standalone que usa el CLI de TypeORM
// para generar/correr migraciones (data-source.ts) — así nunca se
// desincronizan.
export const ENTIDADES = [Habitacion, Registro, Historial];

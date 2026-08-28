import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { ENTIDADES } from './database.entities';

// Carga .env en local (en producción, Render inyecta las variables de
// entorno directo, no hay archivo .env ahí).
config();

// DataSource independiente SOLO para el CLI de TypeORM
// (migration:generate / migration:run / migration:revert). Nest arma
// su propia conexión en app.module.ts — esta existe nada más para que
// la terminal pueda hablarle a Postgres al generar o correr migraciones.
//
// Uso:
//   npm run typeorm -- migration:generate src/migrations/NombreMigracion
//   npm run typeorm -- migration:run
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ENTIDADES,
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  ssl: { rejectUnauthorized: false }, // Neon/Supabase piden conexión SSL
});

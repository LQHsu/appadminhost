import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HabitacionesModule } from './habitaciones/habitaciones.module';
import { RegistrosModule } from './registros/registros.module';
import { HistorialModule } from './historial/historial.module';
import { ENTIDADES } from './database.entities';

// Dos modos, elegidos según exista o no DATABASE_URL:
//
// - Sin DATABASE_URL (tu máquina): SQLite local + synchronize, igual
//   que siempre — cero fricción para desarrollar, no necesitas
//   Postgres instalado.
// - Con DATABASE_URL (producción, ej. Render + Neon/Supabase):
//   Postgres + migraciones. NUNCA synchronize en producción: cualquier
//   cambio de esquema pasa por una migración versionada en
//   src/migrations que revisas antes de correr, no algo automático que
//   pueda alterar/tronar una columna sin avisar.
@Module({
  imports: [
    process.env.DATABASE_URL
      ? TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: ENTIDADES,
          migrations: [__dirname + '/migrations/*.js'],
          migrationsRun: true, // corre migraciones pendientes al arrancar
          synchronize: false,
          ssl: { rejectUnauthorized: false }, // Neon/Supabase piden SSL
        })
      : TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: 'hostal.sqlite',
          entities: ENTIDADES,
          synchronize: true,
        }),
    HabitacionesModule,
    RegistrosModule,
    HistorialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

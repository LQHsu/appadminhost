import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiKeyGuard } from './common/api-key.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // En producción (Postgres) SIEMPRE debe haber APP_KEY configurada —
  // si falta, la API queda completamente pública para cualquiera con
  // la URL. Este warning es la única señal de que alguien la olvidó.
  if (process.env.DATABASE_URL && !process.env.APP_KEY) {
    console.warn(
      '⚠️  ADVERTENCIA: corriendo contra Postgres sin APP_KEY configurada — la API queda sin protección.',
    );
  }

  app.useGlobalGuards(new ApiKeyGuard());

  // Valida automáticamente todos los DTOs (equivalente global a tus
  // Reactive Forms validators, pero del lado del servidor). whitelist
  // descarta cualquier campo que no esté en el DTO — así nadie puede
  // mandar "checkIn" o "totalACobrar" a mano desde el frontend.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Convierte strings numéricos ("1") a number antes de validar.
      // Con esto, un <select> del frontend que mande texto por error
      // no truena con 400 — se corrige solo. No reemplaza el fix del
      // lado Angular ([ngValue]), pero es un colchón extra.
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors(); // para que Angular (otro puerto) pueda consumir la API

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Hostal backend corriendo en http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();

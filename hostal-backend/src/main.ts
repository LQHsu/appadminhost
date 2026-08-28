import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

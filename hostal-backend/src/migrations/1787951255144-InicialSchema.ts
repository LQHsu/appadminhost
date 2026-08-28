import { MigrationInterface, QueryRunner } from "typeorm";

export class InicialSchema1787951255144 implements MigrationInterface {
    name = 'InicialSchema1787951255144'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."registro_metodopago_enum" AS ENUM('EFECTIVO', 'TARJETA')`);
        await queryRunner.query(`CREATE TYPE "public"."registro_renovar_enum" AS ENUM('SI', 'NO', 'PENDIENTE')`);
        await queryRunner.query(`CREATE TABLE "registro" ("id" SERIAL NOT NULL, "nombreCliente" character varying NOT NULL, "checkIn" TIMESTAMP NOT NULL DEFAULT now(), "camasSolicitadas" integer NOT NULL, "costoPorCama" numeric NOT NULL, "noches" integer NOT NULL, "otroCobro" numeric NOT NULL DEFAULT '0', "totalACobrar" numeric NOT NULL, "checkOutEstimado" TIMESTAMP NOT NULL, "checkOutReal" TIMESTAMP, "otroCobroCheckout" numeric NOT NULL DEFAULT '0', "multaTardio" numeric NOT NULL DEFAULT '0', "documentoIdentidad" character varying NOT NULL, "metodoPago" "public"."registro_metodopago_enum" NOT NULL, "renovar" "public"."registro_renovar_enum" NOT NULL DEFAULT 'PENDIENTE', "atendio" character varying NOT NULL, "cerrado" boolean NOT NULL DEFAULT false, "habitacionId" integer, CONSTRAINT "PK_68115a72117fce58864e9bf6509" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "habitacion" ("id" SERIAL NOT NULL, "piso" integer NOT NULL, "numero" character varying NOT NULL, "camasTotales" integer NOT NULL, CONSTRAINT "UQ_9a043433cedab3151f43cf200c7" UNIQUE ("numero"), CONSTRAINT "PK_73bc53f59f307a6e3a405ff0fec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."historial_tipo_enum" AS ENUM('CHECK_IN', 'RENOVACION', 'CHECKOUT')`);
        await queryRunner.query(`CREATE TYPE "public"."historial_metodopago_enum" AS ENUM('EFECTIVO', 'TARJETA')`);
        await queryRunner.query(`CREATE TYPE "public"."historial_renovarfinal_enum" AS ENUM('SI', 'NO', 'PENDIENTE')`);
        await queryRunner.query(`CREATE TABLE "historial" ("id" SERIAL NOT NULL, "registroOriginalId" integer NOT NULL, "tipo" "public"."historial_tipo_enum" NOT NULL, "fechaEvento" TIMESTAMP NOT NULL, "periodoDesde" TIMESTAMP NOT NULL, "periodoHasta" TIMESTAMP NOT NULL, "nombreCliente" character varying NOT NULL, "checkIn" TIMESTAMP NOT NULL, "checkOut" TIMESTAMP, "camas" integer NOT NULL, "costoPorCama" numeric NOT NULL, "noches" integer NOT NULL, "otroCobro" numeric NOT NULL, "totalCobrado" numeric NOT NULL, "multa" numeric NOT NULL DEFAULT '0', "piso" integer NOT NULL, "habitacionNumero" character varying NOT NULL, "documentoIdentidad" character varying NOT NULL, "metodoPago" "public"."historial_metodopago_enum" NOT NULL, "renovarFinal" "public"."historial_renovarfinal_enum" NOT NULL, "atendio" character varying NOT NULL, CONSTRAINT "PK_4b263e390d61f738528f93bcbe1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "registro" ADD CONSTRAINT "FK_177cd862033fcc77b64316a58cc" FOREIGN KEY ("habitacionId") REFERENCES "habitacion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registro" DROP CONSTRAINT "FK_177cd862033fcc77b64316a58cc"`);
        await queryRunner.query(`DROP TABLE "historial"`);
        await queryRunner.query(`DROP TYPE "public"."historial_renovarfinal_enum"`);
        await queryRunner.query(`DROP TYPE "public"."historial_metodopago_enum"`);
        await queryRunner.query(`DROP TYPE "public"."historial_tipo_enum"`);
        await queryRunner.query(`DROP TABLE "habitacion"`);
        await queryRunner.query(`DROP TABLE "registro"`);
        await queryRunner.query(`DROP TYPE "public"."registro_renovar_enum"`);
        await queryRunner.query(`DROP TYPE "public"."registro_metodopago_enum"`);
    }

}

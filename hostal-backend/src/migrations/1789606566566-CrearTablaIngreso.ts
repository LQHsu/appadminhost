import { MigrationInterface, QueryRunner } from "typeorm";

export class CrearTablaIngreso1789606566566 implements MigrationInterface {
    name = 'CrearTablaIngreso1789606566566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ingreso_concepto_enum" AS ENUM('HOSPEDAJE', 'MULTA', 'COBRO_EXTRA')`);
        await queryRunner.query(`CREATE TYPE "public"."ingreso_metodopago_enum" AS ENUM('EFECTIVO', 'TARJETA')`);
        await queryRunner.query(`CREATE TABLE "ingreso" ("id" SERIAL NOT NULL, "concepto" "public"."ingreso_concepto_enum" NOT NULL, "metodoPago" "public"."ingreso_metodopago_enum" NOT NULL, "cantidad" numeric NOT NULL, "fecha" TIMESTAMP NOT NULL, "historialId" integer, "registroId" integer, CONSTRAINT "PK_f5b9cf85dd43c68b3d4d63cbf05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ingreso" ADD CONSTRAINT "FK_920aa6311a8eef2184977bfb592" FOREIGN KEY ("historialId") REFERENCES "historial"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ingreso" ADD CONSTRAINT "FK_b8c8401dfd8ef64c2a2486d1b1b" FOREIGN KEY ("registroId") REFERENCES "registro"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" DROP CONSTRAINT "FK_b8c8401dfd8ef64c2a2486d1b1b"`);
        await queryRunner.query(`ALTER TABLE "ingreso" DROP CONSTRAINT "FK_920aa6311a8eef2184977bfb592"`);
        await queryRunner.query(`DROP TABLE "ingreso"`);
        await queryRunner.query(`DROP TYPE "public"."ingreso_metodopago_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ingreso_concepto_enum"`);
    }

}

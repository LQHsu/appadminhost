import { MigrationInterface, QueryRunner } from "typeorm";

export class CorteCajaYTarifas1790737357931 implements MigrationInterface {
    name = 'CorteCajaYTarifas1790737357931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "habitacion" ADD "costoPorCama" numeric`);
        await queryRunner.query(`CREATE TABLE "corte_caja" ("id" SERIAL NOT NULL, "desde" TIMESTAMP NOT NULL, "hasta" TIMESTAMP NOT NULL, "denominaciones" text NOT NULL, "efectivoContado" numeric NOT NULL, "efectivoSistema" numeric NOT NULL, "diferenciaEfectivo" numeric NOT NULL, "reporteTerminal" numeric, "tarjetaSistema" numeric NOT NULL, "diferenciaTarjeta" numeric, "entregadoPor" character varying NOT NULL, "entregadoA" character varying NOT NULL, "comentarios" character varying, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_corte_caja" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "corte_caja"`);
        await queryRunner.query(`ALTER TABLE "habitacion" DROP COLUMN "costoPorCama"`);
    }

}

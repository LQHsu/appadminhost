import { MigrationInterface, QueryRunner } from "typeorm";

export class ConceptoExtra1790733110435 implements MigrationInterface {
    name = 'ConceptoExtra1790733110435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "concepto_extra" ("id" SERIAL NOT NULL, "nombre" character varying NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_concepto_extra_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_concepto_extra" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ingreso" ADD "conceptoExtraNombre" character varying`);
        await queryRunner.query(`ALTER TABLE "ingreso" ADD "unidades" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" DROP COLUMN "unidades"`);
        await queryRunner.query(`ALTER TABLE "ingreso" DROP COLUMN "conceptoExtraNombre"`);
        await queryRunner.query(`DROP TABLE "concepto_extra"`);
    }

}

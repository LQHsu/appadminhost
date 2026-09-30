import { MigrationInterface, QueryRunner } from "typeorm";

export class AcuseRecepcion1790738174464 implements MigrationInterface {
    name = 'AcuseRecepcion1790738174464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "acuse_recepcion" ("id" SERIAL NOT NULL, "desde" TIMESTAMP NOT NULL, "hasta" TIMESTAMP NOT NULL, "documentosEntregados" text NOT NULL, "fechaRecepcion" TIMESTAMP NOT NULL, "firmaRecibio" character varying NOT NULL, "comentarios" character varying, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_acuse_recepcion" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "acuse_recepcion"`);
    }

}

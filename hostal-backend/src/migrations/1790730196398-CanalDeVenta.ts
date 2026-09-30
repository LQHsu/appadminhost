import { MigrationInterface, QueryRunner } from "typeorm";

export class CanalDeVenta1790730196398 implements MigrationInterface {
    name = 'CanalDeVenta1790730196398'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "canal_venta" ("id" SERIAL NOT NULL, "nombre" character varying NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_canal_venta_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_canal_venta" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "historial" ADD "canalVentaNombre" character varying`);
        await queryRunner.query(`ALTER TABLE "registro" ADD "canalVentaId" integer`);
        await queryRunner.query(`ALTER TABLE "registro" ADD CONSTRAINT "FK_registro_canal_venta" FOREIGN KEY ("canalVentaId") REFERENCES "canal_venta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registro" DROP CONSTRAINT "FK_registro_canal_venta"`);
        await queryRunner.query(`ALTER TABLE "registro" DROP COLUMN "canalVentaId"`);
        await queryRunner.query(`ALTER TABLE "historial" DROP COLUMN "canalVentaNombre"`);
        await queryRunner.query(`DROP TABLE "canal_venta"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class MontoNetoYNotaDePago1791847953109 implements MigrationInterface {
    name = 'MontoNetoYNotaDePago1791847953109'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" ADD "montoNeto" numeric`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" DROP COLUMN "montoNeto"`);
    }

}

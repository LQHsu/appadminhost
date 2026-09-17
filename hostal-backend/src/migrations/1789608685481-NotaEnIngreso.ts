import { MigrationInterface, QueryRunner } from "typeorm";

export class NotaEnIngreso1789608685481 implements MigrationInterface {
    name = 'NotaEnIngreso1789608685481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" ADD "nota" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ingreso" DROP COLUMN "nota"`);
    }

}

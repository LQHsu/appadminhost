import { MigrationInterface, QueryRunner } from "typeorm";

export class CheckInEditable1788396272979 implements MigrationInterface {
    name = 'CheckInEditable1788396272979'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registro" ALTER COLUMN "checkIn" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "registro" ALTER COLUMN "checkIn" SET DEFAULT now()`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class CobroExtraComoEvento1789611763281 implements MigrationInterface {
    name = 'CobroExtraComoEvento1789611763281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."historial_tipo_enum" ADD VALUE 'COBRO_EXTRA'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."historial_tipo_enum_old" AS ENUM('CHECK_IN', 'RENOVACION', 'CHECKOUT')`);
        await queryRunner.query(`ALTER TABLE "historial" ALTER COLUMN "tipo" TYPE "public"."historial_tipo_enum_old" USING "tipo"::"text"::"public"."historial_tipo_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."historial_tipo_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."historial_tipo_enum_old" RENAME TO "historial_tipo_enum"`);
    }

}

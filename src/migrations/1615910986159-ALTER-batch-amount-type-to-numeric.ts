import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERBatchAmountTypeToNumeric1615910986159 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "batch" ADD COLUMN "_amount" decimal`);
        await queryRunner.query(`UPDATE "batch" SET "_amount" = cast("amount" AS decimal)`);
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "batch" RENAME COLUMN "_amount" TO "amount"`);
        await queryRunner.query(`ALTER TABLE "batch" ALTER COLUMN "amount" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "batch" ADD COLUMN "_amount" double precision`);
        await queryRunner.query(`UPDATE "batch" SET "_amount" = cast("amount" AS double precision)`);
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "batch" RENAME COLUMN "_amount" TO "amount"`);
        await queryRunner.query(`ALTER TABLE "batch" ALTER COLUMN "amount" SET NOT NULL`);
    }

}

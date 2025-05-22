import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERBatchAddCode1608677096276 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SEQUENCE batchcode START WITH 10000`)
        await queryRunner.query(`ALTER TABLE "batch" ADD COLUMN "batch_code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "batch" ALTER COLUMN "source_info" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "batch" ALTER COLUMN "destination_info" SET DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "batch_code"`);
        await queryRunner.query(`DROP SEQUENCE batchcode`);
    }

}

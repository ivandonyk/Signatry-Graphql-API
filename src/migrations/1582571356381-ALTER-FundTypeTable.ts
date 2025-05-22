import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTypeTable1582571356381 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_type" RENAME "order_number" TO "order_num"');
        await queryRunner.query('ALTER TABLE "fund_type" ADD COLUMN "created_by" uuid NULL');
        await queryRunner.query('ALTER TABLE "fund_type" ADD COLUMN "updated_by" uuid NULL');
        await queryRunner.query(
            'ALTER TABLE "fund_type" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_type" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "fund_type" DROP COLUMN "updated_by"');
        await queryRunner.query('ALTER TABLE "fund_type" DROP COLUMN "created_by"');
        await queryRunner.query('ALTER TABLE "fund_type" RENAME "order_num" TO "order_number"');
    }
}

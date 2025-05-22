import { MigrationInterface, QueryRunner } from 'typeorm';

export class test1582135334117 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD "enabled" boolean NOT NULL DEFAULT true',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" RENAME COLUMN investment_pool_id TO investment_id'
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" RENAME COLUMN price TO close_price'
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD "close_price_as_of" TIMESTAMP',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD "created_by_id" uuid',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD "updated_by_id" uuid',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" RENAME TO "investment_unit_price_history"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_unit_price_history" RENAME TO "investment_pool_unit_price"'
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP COLUMN "updated_by_id"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP COLUMN "created_by_id"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP COLUMN "close_price_as_of"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" RENAME COLUMN close_price TO price'
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" RENAME COLUMN investment_id TO investment_pool_id'
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP COLUMN "enabled"',
            undefined
        );
    }
}

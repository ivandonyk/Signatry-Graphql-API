import { MigrationInterface, QueryRunner } from 'typeorm';

export class test21582083241248 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_pool" RENAME COLUMN ordinal TO order_num',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "enabled" boolean NOT NULL DEFAULT true',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "description" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "close_price" double precision',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "close_price_as_of" TIMESTAMP',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "ticker_symbol" character varying',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "created_by_id" uuid',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" ADD "updated_by_id" uuid',
            undefined
        );
        await queryRunner.query('ALTER TABLE "investment_pool" RENAME TO "investment"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "investment" RENAME TO "investment_pool"');
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "updated_by_id"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "created_by_id"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "ticker_symbol"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "close_price_as_of"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "close_price"',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "investment_pool" DROP COLUMN "description"',
            undefined
        );
        await queryRunner.query('ALTER TABLE "investment_pool" DROP COLUMN "enabled"', undefined);
        await queryRunner.query(
            'ALTER TABLE "investment_pool" RENAME COLUMN order_num TO ordinal',
            undefined
        );
    }
}

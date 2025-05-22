import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInvestmentUnitPriceHistoryDefault1583280699727 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_unit_price_history" ALTER COLUMN "close_price_as_of" SET DEFAULT CURRENT_TIMESTAMP'
        );
        await queryRunner.query(
            'UPDATE "investment_unit_price_history" SET "close_price_as_of" = "created_on"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_unit_price_history" ALTER COLUMN "close_price_as_of" DROP DEFAULT'
        );
        await queryRunner.query(
            'UPDATE "investment_unit_price_history" SET "close_price_as_of" = NULL'
        );
    }
}

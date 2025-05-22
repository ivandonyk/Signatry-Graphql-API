import { MigrationInterface, QueryRunner } from 'typeorm';

export class addInvestmentPoolUnitPricePreviousPrice1580879935699 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" ADD "previous_price" double precision',
            undefined
        );
        await queryRunner.query(`
UPDATE investment_pool_unit_price
SET previous_price = u.lag_previous_price
FROM (
SELECT 
    *,
    lag(price, 1) OVER (PARTITION BY investment_pool_id ORDER BY created_on ASC) lag_previous_price
FROM investment_pool_unit_price
) u
WHERE investment_pool_unit_price.id = u.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment_pool_unit_price" DROP COLUMN "previous_price"',
            undefined
        );
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class FNGetFundAmountAvailable1587407942070 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Return sum of (units in each fund_investment * latest unit price for investment)
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_available(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount_available NUMERIC;
            BEGIN
                SELECT SUM(fund_investment.units * latest_close_price.close_price) as amount_available
                INTO amount_available
                FROM fund_investment
                LEFT JOIN (SELECT * FROM get_latest_close_prices()) latest_close_price
                ON fund_investment.investment_id = latest_close_price.investment_id
                WHERE fund_investment.fund_id = $1;
                RETURN amount_available;
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_available;
        `);
    }
}

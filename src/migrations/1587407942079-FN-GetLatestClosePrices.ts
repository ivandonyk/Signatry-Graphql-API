import { MigrationInterface, QueryRunner } from 'typeorm';

export class FNGetLatestClosePrices1587407942079 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_latest_close_prices()
            RETURNS TABLE (
                investment_id uuid,
                close_price float8
            )
            AS $$
            BEGIN
                RETURN QUERY SELECT
                    latest_close_price.investment_id,
                    latest_close_price.close_price
                FROM (
                    SELECT
                        investment_unit_price_history.close_price,
                        investment_unit_price_history.investment_id,
                        -- partition by investment, order by date
                        RANK() OVER (
                            PARTITION BY investment_unit_price_history.investment_id
                            ORDER BY investment_unit_price_history.close_price_as_of DESC
                        ) AS rank
                    FROM investment_unit_price_history
                ) latest_close_price
                -- take first result from each partition
                WHERE latest_close_price.rank = 1;
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_latest_close_prices();
        `);
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRFundInvestmentUpdate1587407991440 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Update fund.amount_available when fund_investment.units changes
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_investment_update() RETURNS trigger AS $$
            DECLARE
                amount float8;
            BEGIN
                -- if units has changed
                IF NEW.units <> OLD.units THEN
                    SELECT * FROM get_fund_amount_available(NEW.fund_id)
                    INTO amount;
                    -- update fund.amount_available and fund.amount_pending
                    UPDATE fund SET
                        amount_available = amount,
                        amount_pending = amount + COALESCE(get_fund_amount_outstanding(NEW.fund_id), 0)
                    WHERE id = NEW.fund_id;
                END IF;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Trigger fund_investment_update
         */
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_investment_update
            AFTER UPDATE ON fund_investment
            FOR EACH ROW EXECUTE PROCEDURE fund_investment_update();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_investment_update ON fund_investment;
        `);
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_investment_update;
        `);
    }
}

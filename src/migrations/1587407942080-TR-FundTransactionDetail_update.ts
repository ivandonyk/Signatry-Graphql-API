import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRFundTransactionDetailUpdate1587407942080 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Update fund_investment.units when a fund_transaction_detail
         * record transitions to status 'INVESTED' or 'PAYMENT_IN_PROCESS'
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_detail_update() RETURNS trigger AS $$
                DECLARE
                    status_name text;
                BEGIN
                    -- ignore updates that don't include a status change
                    IF NEW.transaction_detail_status_id = OLD.transaction_detail_status_id THEN
                        return NEW;
                    END IF;
                    
                    -- get fund_transaction_detail status name
                    SELECT name
                    INTO status_name
                    FROM transaction_detail_status
                    WHERE id = NEW.transaction_detail_status_id;
                    
                    -- if status name is 'INVESTED' or 'PAYMENT_IN_PROCESS',
                    -- add the units to the fund_investment.units total
                    IF status_name IN('INVESTED', 'PAYMENT_IN_PROCESS') THEN
                        UPDATE fund_investment
                        SET units = units + COALESCE(NEW.units, 0)
                        WHERE id = NEW.fund_investment_id;
                    END IF;

                    RETURN NEW;
                END
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Trigger fund_transaction_detail_update
         */
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_update
            AFTER UPDATE ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_update();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_transaction_detail_update ON fund_transaction_detail;
        `);
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_detail_update;
        `);
    }
}

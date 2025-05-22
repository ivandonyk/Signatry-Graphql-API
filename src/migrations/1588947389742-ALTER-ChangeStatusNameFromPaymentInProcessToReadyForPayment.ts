import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERChangeStatusNameFromPaymentInProcessToReadyForPayment1588947389742
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'READY_FOR_PAYMENT\' WHERE "name" = \'PAYMENT_IN_PROCESS\''
        );

        await queryRunner.query(
            'UPDATE "transaction_detail_status" SET "name" = \'READY_FOR_PAYMENT\' WHERE "name" = \'PAYMENT_IN_PROCESS\''
        );

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
                    
                    -- alter to use new READY_FOR_PAYMENT
                    IF status_name IN('INVESTED', 'READY_FOR_PAYMENT') THEN
                        UPDATE fund_investment
                        SET units = units + COALESCE(NEW.units, 0)
                        WHERE id = NEW.fund_investment_id;
                    END IF;

                    RETURN NEW;
                END
            $$ LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
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
                    
                    IF status_name IN('INVESTED', 'PAYMENT_IN_PROCESS') THEN
                        UPDATE fund_investment
                        SET units = units + COALESCE(NEW.units, 0)
                        WHERE id = NEW.fund_investment_id;
                    END IF;

                    RETURN NEW;
                END
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(
            'UPDATE "transaction_status" SET "name" = \'PAYMENT_IN_PROCESS\' WHERE "name" = \'READY_FOR_PAYMENT\''
        );

        await queryRunner.query(
            'UPDATE "transaction_detail_status" SET "name" = \'PAYMENT_IN_PROCESS\' WHERE "name" = \'READY_FOR_PAYMENT\''
        );
    }
}

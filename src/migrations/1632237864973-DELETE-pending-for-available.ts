import { MigrationInterface, QueryRunner } from 'typeorm';

export class DELETEPendingForAvailable1632237864973 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP FUNCTION get_fund_amount_pending_incoming_for_available (fund_id uuid)'
        );
        await queryRunner.query(
            'DROP FUNCTION get_fund_amount_pending_outgoing_for_available (fund_id uuid)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // functions as of 2021-09-21
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming_for_available (fund_id uuid)
                RETURNS numeric
                LANGUAGE plpgsql
                AS $function$
            DECLARE
                amount numeric;
            BEGIN
                SELECT
                    sum(ftd.amount) INTO amount
                FROM
                    fund_transaction_detail ftd
                    JOIN fund_transaction ft ON ftd.fund_transaction_id = ft.id
                    JOIN transaction_status ts ON ft.transaction_status_id = ts.id
                    JOIN transaction_detail_type tdt ON ftd.transaction_detail_type_id = tdt.id
                    JOIN transaction_detail_status tds ON ftd.transaction_detail_status_id = tds.id
                WHERE
                    ft.fund_id = $1
                    AND tdt.name = 'CASH_IN'
                    AND ts.name = 'PENDING'
                    AND tds.name != 'SUBMITTED';
                RETURN coalesce(amount, 0);
            END;
            $function$;
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing_for_available (fund_id uuid)
                RETURNS numeric
                LANGUAGE plpgsql
                AS $function$
            DECLARE
                amount numeric;
            BEGIN
                SELECT
                    sum(ftd.amount) INTO amount
                FROM
                    fund_transaction_detail ftd
                    JOIN fund_transaction ft ON ftd.fund_transaction_id = ft.id
                    JOIN transaction_status ts ON ft.transaction_status_id = ts.id
                    JOIN transaction_detail_type tdt ON ftd.transaction_detail_type_id = tdt.id
                    JOIN transaction_detail_status tds ON ftd.transaction_detail_status_id = tds.id
                WHERE
                    ft.fund_id = $1
                    AND tdt.name = 'CASH_OUT'
                    AND ts.name IN ('PENDING', 'IN_REVIEW', 'IN_DUE_DILIGENCE', 'APPROVED', 'PAID')
                    AND tds.name != 'SUBMITTED';
                RETURN coalesce(amount, 0);
            END;
            $function$;
        `);
    }
}

import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERPendingOutgoingFunction1617134587634 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ftd.amount)
                INTO amount
                FROM fund_transaction_detail ftd
                JOIN fund_transaction ft
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'DIVESTMENT'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ftd.amount)
                INTO amount
                FROM fund_transaction_detail ftd
                JOIN fund_transaction ft
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'CASH_OUT'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }

}

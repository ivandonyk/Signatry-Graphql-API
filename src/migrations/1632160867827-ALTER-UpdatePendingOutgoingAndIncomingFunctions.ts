import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERUpdatePendingOutgoingAndIncomingFunctions1632160867827
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ABS(ft.amount))
                INTO amount
                FROM fund_transaction ft
                JOIN transaction_type tt
                    ON ft.transaction_type_id = tt.id
                JOIN transaction_status ts
                    ON ft.transaction_status_id = ts.id
                WHERE ft.fund_id = $1
                AND tt.name IN (
                    'GRANT',
                    'TRANSFER_OUT',
                    'FEE',
                    'PROCESSING_FEE',
                    'ADVISOR_FEE',
                    'BANK_FEE',
                    'INVESTMENT_FEE',
                    'ADMINISTRATION_FEE'
                )
                AND ts.name NOT IN ('CANCELED', 'SUBMITTED', 'COMPLETE');
              
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
            SELECT SUM(ABS(ft.amount))
                INTO amount
                FROM fund_transaction ft
                JOIN transaction_type tt
                    ON ft.transaction_type_id = tt.id
                JOIN transaction_status ts
                    ON ft.transaction_status_id = ts.id
                WHERE ft.fund_id = $1
                AND tt.name IN (
                    'CONTRIBUTION',
                    'TRANSFER_IN',
                    'DIVIDEND',
                    'INTEREST'
                )
                AND ts.name NOT IN ('CANCELED', 'SCHEDULED', 'COMPLETE');
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

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming(fund_id UUID) RETURNS NUMERIC AS $$
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
                AND tdt.name = 'CASH_IN'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYOUT',
                    'PENDING_PAYOUT',
                    'PENDING_RECONCILIATION'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }
}

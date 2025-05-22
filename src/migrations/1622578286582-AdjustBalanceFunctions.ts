import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdjustBalanceFunctions1622578286582 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_fund_amount_pending_outgoing_for_available'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_fund_amount_pending_incoming_for_available'
        );
        // Update pending outgoing and incoming functions to use new type
        await queryRunner.query(/*sql*/ `
              CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing_for_available(fund_id UUID) RETURNS NUMERIC AS $$
              DECLARE
                  amount NUMERIC;
              BEGIN
                  SELECT SUM(ftd.amount)
                  INTO amount
                  FROM fund_transaction_detail ftd
                  JOIN fund_transaction ft
                      ON ftd.fund_transaction_id = ft.id
                  JOIN transaction_status ts
                      ON ft.transaction_status_id = ts.id
                  JOIN transaction_detail_type tdt
                      ON ftd.transaction_detail_type_id = tdt.id
                  JOIN transaction_detail_status tds
                      ON ftd.transaction_detail_status_id = tds.id
                  WHERE ft.fund_id = $1
                  AND tdt.name = 'CASH_OUT'
                  AND ts.name = 'PENDING'
                  AND tds.name != 'SUBMITTED';
                  RETURN COALESCE(amount, 0);
              END;
              $$
              LANGUAGE plpgsql;
          `);
        await queryRunner.query(/*sql*/ `
              CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming_for_available(fund_id UUID) RETURNS NUMERIC AS $$
              DECLARE
                  amount NUMERIC;
              BEGIN
                  SELECT SUM(ftd.amount)
                  INTO amount
                  FROM fund_transaction_detail ftd
                  JOIN fund_transaction ft
                      ON ftd.fund_transaction_id = ft.id
                  JOIN transaction_status ts
                      ON ft.transaction_status_id = ts.id
                  JOIN transaction_detail_type tdt
                      ON ftd.transaction_detail_type_id = tdt.id
                  JOIN transaction_detail_status tds
                      ON ftd.transaction_detail_status_id = tds.id
                  WHERE ft.fund_id = $1
                  AND tdt.name = 'CASH_IN'
                  AND ts.name = 'PENDING'
                  AND tds.name !='SUBMITTED';
                  RETURN COALESCE(amount, 0);
              END;
              $$
              LANGUAGE plpgsql;
          `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP FUNCTION get_fund_amount_pending_outgoing_for_available');
        await queryRunner.query('DROP FUNCTION get_fund_amount_pending_incoming_for_available');
    }
}

import { MigrationInterface, QueryRunner } from 'typeorm';
import { View } from 'typeorm/schema-builder/view/View';

export class ALTERMaterializeTransactionView1632413917946 implements MigrationInterface {
    private view = 'vw_all_transaction';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW ${this.view};`);
        /**
         * view definition as of 09/23/2021
         * only added `MATERIALIZED` specification
         * */
        await queryRunner.query(`CREATE MATERIALIZED VIEW ${this.view} AS SELECT all_trans.id,
        all_trans.fund_transaction_id,
        all_trans.transaction_date_time,
        all_trans.transaction_code,
        all_trans.amount,
        all_trans.transaction_type,
        all_trans.fund_id,
        all_trans.fund_name,
        all_trans.fund_code,
        all_trans.fund_key,
        'N/A'::text AS source_account_title,
        NULL::text AS source_account_number,
        NULL::text AS source_account_id,
        'N/A'::text AS destination_account_title,
        NULL::text AS destination_account_number,
        NULL::text AS destination_account_id,
        all_trans.transaction_status,
        all_trans.status_desc,
            CASE
                WHEN all_trans.transaction_type::text = 'GRANT'::text OR all_trans.transaction_type::text = 'GRANT_SERIES'::text OR all_trans.transaction_type::text = 'GRANT_DIVESTMENT_CASH'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'SUBMITTED'::text OR all_trans.transaction_status::text = 'IN_DUE_DILIGENCE'::text OR all_trans.transaction_status::text = 'NEW'::text OR all_trans.transaction_status::text = 'IN_REVIEW'::text OR all_trans.transaction_status::text = 'APPROVED'::text OR all_trans.transaction_status::text = 'SCHEDULED'::text OR all_trans.transaction_status::text = 'PAID'::text OR all_trans.transaction_status::text = 'PENDING_RECONCILIATION'::text OR all_trans.transaction_status::text = 'READY_FOR_DIVESTMENT'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'CONTRIBUTION'::text OR all_trans.transaction_type::text = 'CONTRIBUTION_SERIES'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'NEW'::text OR all_trans.transaction_status::text = 'PENDING'::text OR all_trans.transaction_status::text = 'PENDING_RECONCILIATION'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'TRANSFER_IN'::text OR all_trans.transaction_type::text = 'TRANSFER_OUT'::text OR all_trans.transaction_type::text = 'REBALANCE'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'PENDING'::text OR all_trans.transaction_status::text = 'PENDING_RECONCILIATION'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'INVESTMENT'::text OR all_trans.transaction_type::text = 'DIVESTMENT'::text OR all_trans.transaction_type::text = 'TRANSFER'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'PENDING'::text OR all_trans.transaction_status::text = 'READY_FOR_DIVESTMENT'::text OR all_trans.transaction_status::text = 'READY_FOR_INVESTMENT'::text OR all_trans.transaction_status::text = 'PENDING_RECONCILIATION'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'FEE'::text OR all_trans.transaction_type::text = 'INVESTMENT_FEE'::text OR all_trans.transaction_type::text = 'BANK_FEE'::text OR all_trans.transaction_type::text = 'PROCESSING_FEE'::text OR all_trans.transaction_type::text = 'ADVISOR_FEE'::text OR all_trans.transaction_type::text = 'ADMINISTRATION_FEE'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'PENDING'::text OR all_trans.transaction_status::text = 'SUBMITTED'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'INTEREST'::text OR all_trans.transaction_type::text = 'DIVIDEND'::text OR all_trans.transaction_type::text = 'INCOME'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'PENDING'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                WHEN all_trans.transaction_type::text = 'BUY'::text OR all_trans.transaction_type::text = 'SELL'::text THEN
                CASE
                    WHEN all_trans.transaction_status::text = 'PENDING'::text THEN 'PENDING'::character varying
                    ELSE all_trans.transaction_status
                END
                ELSE NULL::character varying
            END AS accounting_status
       FROM ( SELECT ft.id,
                ft.id AS fund_transaction_id,
                ft.transaction_date_time,
                ft.transaction_code,
                ft.amount,
                tt.name AS transaction_type,
                f.id AS fund_id,
                f.name AS fund_name,
                f.fund_code,
                f.fund_key,
                ts.name AS transaction_status,
                ts.description AS status_desc
               FROM fund_transaction ft
                 JOIN transaction_type tt ON ft.transaction_type_id = tt.id
                 JOIN fund f ON ft.fund_id = f.id
                 JOIN transaction_status ts ON ft.transaction_status_id = ts.id
              WHERE tt.name::text <> ALL (ARRAY['CONTRIBUTION_SERIES'::character varying::text, 'GRANT_SERIES'::character varying::text])
            UNION ALL
             SELECT ftd.id,
                ftd.fund_transaction_id,
                ftd.transaction_date_time,
                ftd.transaction_code,
                ftd.amount,
                tdt.name AS transaction_type,
                f.id AS fund_id,
                f.name AS fund_name,
                f.fund_code,
                f.fund_key,
                tds.name AS transaction_status,
                tds.description AS status_desc
               FROM fund_transaction_detail ftd
                 JOIN transaction_detail_type tdt ON ftd.transaction_detail_type_id = tdt.id
                 JOIN fund_transaction ft ON ftd.fund_transaction_id = ft.id
                 JOIN fund f ON ft.fund_id = f.id
                 JOIN transaction_detail_status tds ON ftd.transaction_detail_status_id = tds.id
              WHERE tdt.name::text = ANY (ARRAY['INVESTMENT'::character varying::text, 'DIVESTMENT'::character varying::text, 'TRANSFER'::character varying::text])) all_trans;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return Promise.resolve();
    }
}

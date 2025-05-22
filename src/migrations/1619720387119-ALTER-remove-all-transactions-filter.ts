import { MigrationInterface, QueryRunner } from 'typeorm';

const view = 'vw_all_transaction';

export class ALTERRemoveAllTransactionsFilter1619720387119 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
DROP VIEW IF EXISTS ${view};

CREATE VIEW ${view} AS
SELECT
	id,
	fund_transaction_id,
	transaction_date_time,
	transaction_code,
	amount,
	transaction_type,
	fund_id,
	fund_name,
	fund_code,
	fund_key,
	'N/A' AS "source_account_title",
	NULL AS "source_account_number",
	NULL AS "source_account_id",
	'N/A' AS "destination_account_title",
	NULL AS "destination_account_number",
	NULL AS "destination_account_id",
	transaction_status,
	status_desc,
	CASE WHEN transaction_type = 'GRANT'
		OR transaction_type = 'GRANT_SERIES'
		OR transaction_type = 'GRANT_DIVESTMENT_CASH' THEN
		CASE WHEN transaction_status = 'SUBMITTED'
			OR transaction_status = 'IN_DUE_DILIGENCE'
			OR transaction_status = 'NEW'
			OR transaction_status = 'IN_REVIEW'
			OR transaction_status = 'APPROVED'
			OR transaction_status = 'SCHEDULED'
			OR transaction_status = 'PAID'
			OR transaction_status = 'PENDING_RECONCILIATION'
			OR transaction_status = 'READY_FOR_DIVESTMENT' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'CONTRIBUTION'
		OR transaction_type = 'CONTRIBUTION_SERIES' THEN
		CASE WHEN transaction_status = 'NEW'
			OR transaction_status = 'PENDING'
			OR transaction_status = 'PENDING_RECONCILIATION' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'TRANSFER_IN'
		OR transaction_type = 'TRANSFER_OUT'
		OR transaction_type = 'REBALANCE' THEN
		CASE WHEN transaction_status = 'PENDING'
			OR transaction_status = 'PENDING_RECONCILIATION' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'INVESTMENT'
		OR transaction_type = 'DIVESTMENT'
		OR transaction_type = 'TRANSFER' THEN
		CASE WHEN transaction_status = 'PENDING'
			OR transaction_status = 'READY_FOR_DIVESTMENT'
			OR transaction_status = 'READY_FOR_INVESTMENT'
			OR transaction_status = 'PENDING_RECONCILIATION' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'FEE'
		OR transaction_type = 'INVESTMENT_FEE'
		OR transaction_type = 'BANK_FEE'
		OR transaction_type = 'PROCESSING_FEE'
		OR transaction_type = 'ADVISOR_FEE'
		OR transaction_type = 'ADMINISTRATION_FEE' THEN
		CASE WHEN transaction_status = 'PENDING'
			OR transaction_status = 'SUBMITTED' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'INTEREST'
		OR transaction_type = 'DIVIDEND'
		OR transaction_type = 'INCOME' THEN
		CASE WHEN transaction_status = 'PENDING' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	WHEN transaction_type = 'BUY'
		OR transaction_type = 'SELL' THEN
		CASE WHEN transaction_status = 'PENDING' THEN
			'PENDING'
		ELSE
			transaction_status
		END
	END AS "accounting_status"
FROM (
	SELECT
		ft.id AS "id",
		ft.id AS "fund_transaction_id",
		ft.transaction_date_time,
		ft.transaction_code,
		ft.amount,
		tt.name AS "transaction_type",
		f.id AS "fund_id",
		f.name AS "fund_name",
		f.fund_code,
		f.fund_key,
		ts.name AS "transaction_status",
		ts.description AS "status_desc"
	FROM
		fund_transaction AS "ft"
		INNER JOIN transaction_type AS "tt" ON ft.transaction_type_id = tt.id
		INNER JOIN fund AS "f" ON ft.fund_id = f.id
		INNER JOIN transaction_status AS "ts" ON ft.transaction_status_id = ts.id
UNION ALL
SELECT
	ftd.id AS "id",
	ftd.fund_transaction_id AS "fund_transaction_id",
	ftd.transaction_date_time,
	ftd.transaction_code,
	ftd.amount,
	tdt.name AS "transaction_type",
	f.id AS "fund_id",
	f.name AS "fund_name",
	f.fund_code,
	f.fund_key,
	tds.name AS "transaction_status",
	tds.description AS "status_desc"
FROM
	fund_transaction_detail AS "ftd"
	INNER JOIN transaction_detail_type AS "tdt" ON ftd.transaction_detail_type_id = tdt.id
	INNER JOIN fund_transaction AS "ft" ON ftd.fund_transaction_id = ft.id
	INNER JOIN fund AS "f" ON ft.fund_id = f.id
	INNER JOIN transaction_detail_status AS "tds" ON ftd.transaction_detail_status_id = tds.id) AS "all_trans";
`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP VIEW IF EXISTS ${view};`);
    }
}

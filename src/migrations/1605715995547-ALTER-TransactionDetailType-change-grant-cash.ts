import { MigrationInterface, QueryRunner } from 'typeorm';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionTypeValue } from '../models/TransactionType';

export class ALTERTransactionDetailTypeChangeGrantCash1605715995547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Split GRANT_CASH into separate PAYMENT and DIVESTMENT types
        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
        CREATE TYPE "transaction_detail_type_name" AS ENUM (
        'GRANT_DIVESTMENT_CASH',
        'GRANT_PAYMENT_CASH',
        'CONTRIBUTION_CASH',
        'INVESTMENT',
        'DIVESTMENT',
        'FEE'
        )`);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        ADD COLUMN "name" "transaction_detail_type_name"
        `);

        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_PAYMENT_CASH' WHERE "_name" = 'GRANT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CONTRIBUTION_CASH' WHERE "_name" = 'CONTRIBUTION_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'INVESTMENT' WHERE "_name" = 'INVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'DIVESTMENT' WHERE "_name" = 'DIVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'FEE' WHERE "_name" = 'FEE'
        `);

        await queryRunner.query('ALTER TABLE "transaction_detail_type" DROP COLUMN "_name"');

        // Update cash balance function to use new type
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_cash_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ABS(ft.amount))
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name IN ('GRANT_PAYMENT_CASH', 'CONTRIBUTION_CASH') 
                AND tds.name IN (
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        // Update pending outgoing function to use new type
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ft.amount)
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'GRANT_PAYMENT_CASH'
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

        // Create new grant divestment cash type
        await queryRunner.query(`
        INSERT INTO "transaction_detail_type" ("name", "description") 
        VALUES ('GRANT_DIVESTMENT_CASH', 'Cash amount to be divested')
        `);

        // Seed grant divestment cash detail records
        await queryRunner.query(`
        INSERT INTO "fund_transaction_detail" (
            "fund_transaction_id", 
            "amount", 
            "transaction_detail_status_id", 
            "transaction_detail_type_id"
            ) SELECT "ft"."id", 
                "ft"."amount", 
                "tds"."id", 
                "tdt"."id" 
                FROM "fund_transaction" "ft"
                CROSS JOIN "transaction_detail_type" "tdt"
                CROSS JOIN "transaction_detail_status" "tds"
                JOIN "transaction_type" "tt" 
                    ON "ft"."transaction_type_id" = "tt"."id"
                WHERE "tt"."name" = 'GRANT'
                AND "tdt"."name" = 'GRANT_DIVESTMENT_CASH'
                AND "tds"."name" = 'COMPLETE'
            `);

        // Drop old type enum
        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');

        // Set all transactions, batches, and details to complete for clean slate after migration
        await queryRunner.query(`
        UPDATE "fund_transaction" 
        SET "transaction_status_id" = (
            SELECT "id" 
            FROM "transaction_status" 
            WHERE "name" = 'COMPLETE' 
            LIMIT 1
            )
        `);

        await queryRunner.query(`
        UPDATE "fund_transaction_detail" 
        SET "transaction_detail_status_id" = (
            SELECT "id" 
            FROM "transaction_detail_status" 
            WHERE "name" = 'COMPLETE' 
            LIMIT 1
            )
        `);

        await queryRunner.query('UPDATE "fund_transaction_batch" SET "status" = \'COMPLETE\'');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ft.amount)
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'GRANT_CASH'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'READY_FOR_DIVESTMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_cash_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ABS(ft.amount))
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name IN ('GRANT_CASH', 'CONTRIBUTION_CASH') 
                AND tds.name IN (
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
        CREATE TYPE "transaction_detail_type_name" AS ENUM (
        'GRANT_CASH',
        'CONTRIBUTION_CASH',
        'INVESTMENT',
        'DIVESTMENT',
        'FEE'
        )`);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        ADD COLUMN "name" "transaction_detail_type_name"
            `);

        await queryRunner.query(`
        DELETE FROM "fund_transaction_detail" WHERE "transaction_detail_type_id" = (
            SELECT "id" FROM "transaction_detail_type" 
            WHERE "_name" = 'GRANT_DIVESTMENT_CASH'
            )`);

        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_CASH' WHERE "_name" = 'GRANT_PAYMENT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CONTRIBUTION_CASH' WHERE "_name" = 'CONTRIBUTION_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'INVESTMENT' WHERE "_name" = 'INVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'DIVESTMENT' WHERE "_name" = 'DIVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'FEE' WHERE "_name" = 'FEE'
        `);

        await queryRunner.query('ALTER TABLE "transaction_detail_type" DROP COLUMN "_name"');

        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');
    }
}

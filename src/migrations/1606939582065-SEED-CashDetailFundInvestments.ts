import {MigrationInterface, QueryRunner} from "typeorm";

export class SEEDCashDetailFundInvestments1606939582065 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set CONTRIBUTION_CASH FundTransactionDetail records to have the FundInvestment
        // that corresponds to the CONTRIBUTION_CASH Investment
        await queryRunner.query(`
        UPDATE "fund_transaction_detail" "ftd"
        SET "fund_investment_id" = "fi"."id"
        FROM (
            SELECT 
                "fi"."id" AS "id", 
                "fi"."fund_id" AS "fund_id"
            FROM "fund_investment" "fi"
            JOIN "investment" "i"
                ON "fi"."investment_id" = "i"."id"
            WHERE "i"."investment_type" = 'CONTRIBUTION_CASH'
            ) "fi"
        WHERE "ftd"."id" IN (
            SELECT "ftd"."id"
            FROM "fund_transaction_detail" "ftd"
            JOIN "transaction_detail_type" "tdt"
                ON "ftd"."transaction_detail_type_id" = "tdt"."id"
            WHERE "tdt"."name" = 'CONTRIBUTION_CASH'
        )
        AND "fi"."fund_id" = (
            SELECT "fund_id"
            FROM "fund_transaction" "ft"
            WHERE "ftd"."fund_transaction_id" = "ft"."id"
            )
        `);

        // Set GRANT_PAYMENT_CASH and GRANT_DIVESTMENT_CASH FundTransactionDetail records to have the 
        // FundInvestment that corresponds to the GRANT_CASH Investment
        await queryRunner.query(`
        UPDATE "fund_transaction_detail" "ftd"
        SET "fund_investment_id" = "fi"."id"
        FROM (
            SELECT 
                "fi"."id" AS "id", 
                "fi"."fund_id" AS "fund_id"
            FROM "fund_investment" "fi"
            JOIN "investment" "i"
                ON "fi"."investment_id" = "i"."id"
            WHERE "i"."investment_type" = 'GRANT_CASH'
            ) "fi"
        WHERE "ftd"."id" IN (
            SELECT "ftd"."id"
            FROM "fund_transaction_detail" "ftd"
            JOIN "transaction_detail_type" "tdt"
                ON "ftd"."transaction_detail_type_id" = "tdt"."id"
            WHERE "tdt"."name" IN ('GRANT_PAYMENT_CASH', 'GRANT_DIVESTMENT_CASH')
        )
        AND "fi"."fund_id" = (
            SELECT "fund_id"
            FROM "fund_transaction" "ft"
            WHERE "ftd"."fund_transaction_id" = "ft"."id"
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE "fund_transaction_detail" "ftd"
        SET "ftd"."fund_investment_id" = NULL
        FROM "transaction_detail_type" "tdt"
        WHERE "ftd"."transaction_detail_type_id" = "tdt"."id"
        AND "tdt"."name" IN (
            'CONTRIBUTION_CASH', 
            'GRANT_PAYMENT_CASH', 
            'GRANT_DIVESTMENT_CASH'
        )`);
    }

}

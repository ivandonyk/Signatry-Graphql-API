import {MigrationInterface, QueryRunner} from "typeorm";
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionTypeValue } from '../models/TransactionType';

export class SEEDCashTransactionDetails1604439943857 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                WHERE "tt"."name" = 'CONTRIBUTION'
                AND "tdt"."name" = 'CONTRIBUTION_CASH'
                AND "tds"."name" = 'COMPLETE'
            `);

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
                AND "tdt"."name" = 'GRANT_CASH'
                AND "tds"."name" = 'COMPLETE'
            `);

        await queryRunner.query(`
        INSERT INTO "fund_transaction_detail" (
            "fund_transaction_id", 
            "amount", 
            "transaction_detail_status_id", 
            "transaction_detail_type_id"
            ) SELECT "cft"."id", 
                "ft"."amount", 
                "tds"."id", 
                "tdt"."id" 
                FROM "fund_transaction" "ft"
                CROSS JOIN "transaction_detail_type" "tdt"
                CROSS JOIN "transaction_detail_status" "tds"
                JOIN "transaction_type" "tt" 
                    ON "ft"."transaction_type_id" = "tt"."id"
                JOIN (
                    SELECT "ft"."id", 
                    "ft"."fund_transaction_source_id" 
                    FROM "fund_transaction" "ft"
                    JOIN "transaction_type" "tt"
                        ON "ft"."transaction_type_id" = "tt"."id"
                    WHERE "tt"."name" = 'CONTRIBUTION'
                    ) "cft"
                    ON "cft"."fund_transaction_source_id" = "ft"."fund_transaction_source_id"
                WHERE "tt"."name" = 'FEE'
                AND "tdt"."name" = 'FEE'
                AND "tds"."name" = 'COMPLETE'
            `);

        await queryRunner.query(`
        DELETE FROM "fund_transaction" 
        WHERE "id" IN (
            SELECT "ft"."id"
            FROM "fund_transaction" "ft"
            JOIN "transaction_type" "tt"
                ON "ft"."transaction_type_id" = "tt"."id"
            WHERE "tt"."name" = 'FEE'
            )
            `);

        }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddFundTransactionSourceId1589995228886
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
             ADD COLUMN "fund_transaction_source_id" uuid`
        );
        await queryRunner.query(
            `UPDATE "fund_transaction" 
             SET "fund_transaction_source_id" = "fund_transaction_source"."id"
             FROM "fund_transaction_source"
             WHERE "fund_transaction"."id" = "fund_transaction_source"."fund_transaction_id"`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
            ADD CONSTRAINT "FK_FundTransactionSource_FundTransaction" FOREIGN KEY ("fund_transaction_source_id") REFERENCES "fund_transaction_source"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction_source"
             DROP COLUMN "fund_transaction_id"`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "fund_transaction_source"
             ADD COLUMN "fund_transaction_id" uuid`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
             DROP CONSTRAINT "FK_FundTransactionSource_FundTransaction"`
        );
        await queryRunner.query(
            `UPDATE "fund_transaction_source" 
             SET "fund_transaction_source"."fund_transaction_id" = "fund_transaction"."id"
             FROM "fund_transaction"
             WHERE "fund_transaction"."fund_transaction_source_id" = "fund_transaction_source"."id"`
        );
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
             DROP COLUMN "fund_transaction_source_id"`
        );
    }
}

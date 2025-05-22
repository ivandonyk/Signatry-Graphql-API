import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionAddNullableOriginalTransactionIdRelation1607385001492
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
             ADD COLUMN "original_fund_transaction_id" uuid`
        );

        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
            ADD CONSTRAINT "FK_OriginalFundTransaction_FundTransaction" FOREIGN KEY ("original_fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
             DROP COLUMN "original_fund_transaction_id"`
        );

        await queryRunner.query(
            `ALTER TABLE "fund_transaction"
            DROP CONSTRAINT "FK_OriginalFundTransaction_FundTransaction"`
        );
    }
}

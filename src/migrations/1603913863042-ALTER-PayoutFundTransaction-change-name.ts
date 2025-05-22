import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERPayoutFundTransactionChangeName1603913863042 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction" RENAME TO "payout_fund_transaction_detail"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction_detail" RENAME COLUMN "fund_transaction_id" TO "fund_transaction_detail_id"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction_detail" DROP CONSTRAINT "FK_FundTransactionId"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction_detail" ADD CONSTRAINT "FK_FundTransactionDetailId" FOREIGN KEY ("fund_transaction_detail_id") REFERENCES "fund_transaction_detail"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction_detail" RENAME TO "payout_fund_transaction"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction" RENAME COLUMN "fund_transaction_detail_id TO "fund_transaction_id"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction" DROP CONSTRAINT "FK_FundTransactionDetailId"`);
        await queryRunner.query(`ALTER TABLE "payout_fund_transaction" ADD CONSTRAINT "FK_FundTransactionId" FOREIGN KEY ("fund_transaction_id") REFERENCES "fund_transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}

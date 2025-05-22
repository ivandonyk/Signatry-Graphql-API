import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERStripePayoutFundTransactionRename1590086073061 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query(
            'ALTER TABLE "stripe_payout_fund_transaction" RENAME TO "payout_fund_transaction"'
        );
        queryRunner.query(
            'ALTER TABLE "payout_fund_transaction" RENAME COLUMN "stripe_payout_id" TO "payout_id"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query(
            'ALTER TABLE "payout_fund_transaction" RENAME TO "stripe_payout_fund_transaction"'
        );
        queryRunner.query(
            'ALTER TABLE "stripe_payout_fund_transaction" RENAME COLUMN "payout_id" TO "stripe_payout_id"'
        );
    }
}

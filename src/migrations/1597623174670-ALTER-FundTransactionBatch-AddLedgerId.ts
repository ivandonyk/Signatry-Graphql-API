import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTransactionBatchAddLedgerId1597623174670 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            `ALTER TABLE "fund_transaction_batch" ADD COLUMN "ledger_id" character varying`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "fund_transaction_batch" DROP COLUMN "ledger_id"`);
    }
}
